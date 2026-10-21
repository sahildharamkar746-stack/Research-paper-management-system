#include "rpms/database.hpp"
#include <iostream>
int main(int argc,char**argv){
 if(argc!=2){std::cerr<<"Usage: rpms_api_test_seed <database-path>\n";return 2;}
 try{
  rpms::Database db(argv[1]);db.initialize();
  if(!db.createUser("Test Faculty","faculty@example.test","faculty-test-pass-123","Faculty"))return 3;
  if(!db.createUser("Test Admin","admin@example.test","admin-test-pass-123","Admin"))return 4;
  std::cout<<"Test roles seeded.\n";return 0;
 }catch(const std::exception&e){std::cerr<<e.what()<<"\n";return 1;}
}
