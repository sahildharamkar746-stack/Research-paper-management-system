#include "rpms/database.hpp"
#include <httplib.h>
#include <nlohmann/json.hpp>
#include <openssl/rand.h>
#include <cstdlib>
#include <iostream>
#include <mutex>
#include <sstream>
#include <stdexcept>
#include <string>
#include <unordered_map>
using json=nlohmann::json;
namespace {
struct Session { rpms::User user; };
std::mutex sessionsMutex;
std::unordered_map<std::string,Session> sessions;
json errorJson(const std::string& m){return json{{"error",m}};}
void sendJson(httplib::Response& r,int status,const json& b){r.status=status;r.set_content(b.dump(),"application/json; charset=utf-8");}
bool readJson(const httplib::Request& req,json& b){try{b=json::parse(req.body);return b.is_object();}catch(...){return false;}}
std::string newToken(){unsigned char b[32]{};if(RAND_bytes(b,sizeof(b))!=1)throw std::runtime_error("Secure token generation failed");const char*d="0123456789abcdef";std::string out;out.reserve(64);for(unsigned char c:b){out+=d[(c>>4U)&15U];out+=d[c&15U];}return out;}
bool bearer(const httplib::Request& req,rpms::User& u){if(!req.has_header("Authorization"))return false;const auto h=req.get_header_value("Authorization");const std::string p="Bearer ";if(h.rfind(p,0)!=0)return false;std::lock_guard<std::mutex> l(sessionsMutex);auto i=sessions.find(h.substr(p.size()));if(i==sessions.end())return false;u=i->second.user;return true;}
bool requireRole(const httplib::Request& q,httplib::Response& r,rpms::User& u,bool admin=false,bool reviewer=false){if(!bearer(q,u)){sendJson(r,401,errorJson("Authentication required"));return false;}if(admin&&u.role!="Admin"){sendJson(r,403,errorJson("Administrator role required"));return false;}if(reviewer&&u.role!="Faculty"&&u.role!="Admin"){sendJson(r,403,errorJson("Faculty or Admin role required"));return false;}return true;}
json paperJson(const rpms::Paper&p){return json{{"id",p.id},{"title",p.title},{"abstract",p.abstractText},{"category",p.category},{"doi",p.doi},{"publicationYear",p.publicationYear},{"venue",p.venue},{"paperType",p.paperType},{"status",p.status},{"authorEmail",p.authorEmail}};}
json userJson(const rpms::User&u){return json{{"id",u.id},{"name",u.name},{"email",u.email},{"role",u.role},{"status",u.status}};}
int envPort(){const char*v=std::getenv("RPMS_PORT");if(!v||!*v)return 8080;try{int p=std::stoi(v);return p>0&&p<=65535?p:8080;}catch(...){return 8080;}}
}
int main(int argc,char**argv){const std::string path=argc>1?argv[1]:"rpms.sqlite3";try{
 rpms::Database db(path);db.initialize();httplib::Server s;s.set_payload_max_length(1024*1024);s.set_read_timeout(5,0);s.set_write_timeout(5,0);
 s.set_default_headers({{"X-Content-Type-Options","nosniff"},{"X-Frame-Options","DENY"},{"Referrer-Policy","no-referrer"}});
 s.set_pre_routing_handler([](const httplib::Request&q,httplib::Response&r){if(q.has_header("Origin")){auto o=q.get_header_value("Origin");if(o=="http://localhost:5500"||o=="http://127.0.0.1:5500"||o=="http://localhost:5173"||o=="http://127.0.0.1:5173"){r.set_header("Access-Control-Allow-Origin",o);r.set_header("Vary","Origin");r.set_header("Access-Control-Allow-Headers","Content-Type, Authorization");r.set_header("Access-Control-Allow-Methods","GET, POST, PATCH, DELETE, OPTIONS");}else{r.status=403;r.set_content("Origin not allowed","text/plain");return httplib::Server::HandlerResponse::Handled;}}if(q.method=="OPTIONS"){r.status=204;return httplib::Server::HandlerResponse::Handled;}return httplib::Server::HandlerResponse::Unhandled;});
 s.Get("/health",[](const auto&,auto&r){sendJson(r,200,json{{"status","ok"},{"service","rpms-cpp"}});});
 s.Post("/api/register",[&db](const auto&q,auto&r){json b;if(!readJson(q,b)){sendJson(r,400,errorJson("Expected a JSON object"));return;}auto name=b.value("name","");auto email=b.value("email","");auto password=b.value("password","");auto role=b.value("role","Student");if(role!="Student"){sendJson(r,403,errorJson("Public registration is limited to Student accounts"));return;}if(name.size()<2||email.empty()||password.size()<8){sendJson(r,400,errorJson("Name, email, or password is invalid"));return;}try{if(!db.createUser(name,email,password,role)){sendJson(r,409,errorJson("An account with that email may already exist"));return;}}catch(...){sendJson(r,409,errorJson("An account with that email may already exist"));return;}sendJson(r,201,json{{"message","Registration successful"}});});
 s.Post("/api/login",[&db](const auto&q,auto&r){json b;if(!readJson(q,b)){sendJson(r,400,errorJson("Expected a JSON object"));return;}rpms::User u;try{if(!db.authenticate(b.value("email",""),b.value("password",""),u)){sendJson(r,401,errorJson("Invalid email or password"));return;}auto t=newToken();{std::lock_guard<std::mutex>l(sessionsMutex);sessions[t]=Session{u};}sendJson(r,200,json{{"token",t},{"user",userJson(u)}});}catch(...){sendJson(r,500,errorJson("Authentication service failed"));}});
 s.Post("/api/logout",[](const auto&q,auto&r){if(!q.has_header("Authorization")){sendJson(r,401,errorJson("Authentication required"));return;}auto h=q.get_header_value("Authorization");const std::string p="Bearer ";if(h.rfind(p,0)!=0){sendJson(r,401,errorJson("Invalid authorization header"));return;}{std::lock_guard<std::mutex>l(sessionsMutex);sessions.erase(h.substr(p.size()));}sendJson(r,200,json{{"message","Logged out"}});});
 s.Get("/api/categories",[&db](const auto&,auto&r){try{sendJson(r,200,json{{"categories",db.listCategories()}});}catch(...){sendJson(r,500,errorJson("Unable to load categories"));}});
 s.Get("/api/papers",[&db](const auto&,auto&r){try{json a=json::array();for(const auto&p:db.listPapers())a.push_back(paperJson(p));sendJson(r,200,json{{"papers",a}});}catch(...){sendJson(r,500,errorJson("Unable to load papers"));}});
 s.Post("/api/papers",[&db](const auto&q,auto&r){rpms::User u;if(!requireRole(q,r,u))return;json b;if(!readJson(q,b)){sendJson(r,400,errorJson("Expected a JSON object"));return;}rpms::Paper p;p.title=b.value("title","");p.abstractText=b.value("abstract","");p.category=b.value("category","");p.doi=b.value("doi","");try{p.publicationYear=b.value("publicationYear",0);}catch(...){sendJson(r,400,errorJson("publicationYear must be an integer"));return;}p.venue=b.value("venue","");p.paperType=b.value("paperType","Research Paper");try{if(!db.createPaper(p,u.id)){sendJson(r,400,errorJson("Title and category are required"));return;}auto all=db.listPapers();sendJson(r,201,json{{"paper",paperJson(all.front())}});}catch(...){sendJson(r,400,errorJson("Paper could not be saved; check category and fields"));}});
 s.Patch(R"(/api/papers/([0-9]+)/status)",[&db](const auto&q,auto&r){rpms::User u;if(!requireRole(q,r,u,true))return;json b;if(!readJson(q,b)){sendJson(r,400,errorJson("Expected a JSON object"));return;}int id=std::stoi(q.matches[1]);auto status=b.value("status","");try{if(!db.updatePaperStatus(id,status)){sendJson(r,400,errorJson("Paper not found or status invalid"));return;}sendJson(r,200,json{{"message","Paper status updated"},{"status",status}});}catch(...){sendJson(r,500,errorJson("Unable to update paper status"));}});
 s.Post(R"(/api/papers/([0-9]+)/reviews)",[&db](const auto&q,auto&r){rpms::User u;if(!requireRole(q,r,u,false,true))return;json b;if(!readJson(q,b)){sendJson(r,400,errorJson("Expected a JSON object"));return;}int id=std::stoi(q.matches[1]);auto d=b.value("decision","");auto c=b.value("comments","");try{if(!db.addReview(id,u.id,d,c)){sendJson(r,400,errorJson("Paper not found or review decision invalid"));return;}sendJson(r,201,json{{"message","Review recorded"},{"decision",d}});}catch(...){sendJson(r,400,errorJson("Review could not be saved"));}});
 s.Get(R"(/api/papers/([0-9]+)/reviews)",[&db](const auto&q,auto&r){rpms::User u;if(!requireRole(q,r,u,false,true))return;int id=std::stoi(q.matches[1]);try{json a=json::array();for(const auto&v:db.listReviews(id))a.push_back(json{{"id",v.id},{"paperId",v.paperId},{"reviewerId",v.reviewerId},{"decision",v.decision},{"comments",v.comments},{"createdAt",v.createdAt}});sendJson(r,200,json{{"reviews",a}});}catch(...){sendJson(r,500,errorJson("Unable to load reviews"));}});
 int port=envPort();std::cout<<"RPMS API listening on http://127.0.0.1:"<<port<<std::endl;if(!s.listen("127.0.0.1",port)){std::cerr<<"Unable to start HTTP server on port "<<port<<"\n";return 1;}return 0;
 }catch(const std::exception&e){std::cerr<<"RPMS startup failed: "<<e.what()<<"\n";return 1;}}
