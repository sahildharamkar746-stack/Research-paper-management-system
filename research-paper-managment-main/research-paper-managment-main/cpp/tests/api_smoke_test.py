#!/usr/bin/env python3
import json, os, socket, subprocess, sys, tempfile, time, urllib.error, urllib.request
exe,seed=sys.argv[1],sys.argv[2]
with socket.socket() as s:
 s.bind(("127.0.0.1",0)); port=s.getsockname()[1]
fd,db=tempfile.mkstemp(prefix="rpms_api_",suffix=".sqlite3");os.close(fd);os.unlink(db)
env=os.environ.copy();env["RPMS_PORT"]=str(port)
proc=None
def req(method,path,body=None,token=None,expected=None):
 data=None if body is None else json.dumps(body).encode()
 headers={"Content-Type":"application/json"}
 if token: headers["Authorization"]="Bearer "+token
 request=urllib.request.Request(f"http://127.0.0.1:{port}{path}",data=data,headers=headers,method=method)
 try:
  with urllib.request.urlopen(request,timeout=3) as r: status,payload=r.status,r.read().decode()
 except urllib.error.HTTPError as e: status,payload=e.code,e.read().decode()
 result=json.loads(payload) if payload else {}
 if expected is not None and status!=expected: raise AssertionError(f"{method} {path}: expected {expected}, got {status}: {result}")
 return status,result
try:
 subprocess.run([seed,db],check=True,capture_output=True,text=True,timeout=10)
 proc=subprocess.Popen([exe,db],env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 for _ in range(80):
  if proc.poll() is not None: raise RuntimeError("server exited: "+(proc.stderr.read() or ""))
  try: _,health=req("GET","/health",expected=200);break
  except (urllib.error.URLError,TimeoutError,ConnectionError):time.sleep(.25)
 else:raise RuntimeError("server did not become ready")
 assert health["status"]=="ok"
 req("POST","/api/papers",{"title":"No auth","category":"Computer Networks"},expected=401)
 req("POST","/api/register",{"name":"Test Student","email":"student@example.test","password":"correct-horse-123","role":"Student"},expected=201)
 req("POST","/api/register",{"name":"Admin Try","email":"admin2@example.test","password":"correct-horse-123","role":"Admin"},expected=403)
 req("POST","/api/register",{"name":"Test Student","email":"student@example.test","password":"correct-horse-123","role":"Student"},expected=409)
 _,student=req("POST","/api/login",{"email":"STUDENT@example.test","password":"correct-horse-123"},expected=200)
 st=student["token"];assert student["user"]["role"]=="Student"
 req("POST","/api/login",{"email":"student@example.test","password":"bad-password"},expected=401)
 _,cats=req("GET","/api/categories",expected=200);assert "Computer Networks" in cats["categories"]
 _,created=req("POST","/api/papers",{"title":"API Test Paper","abstract":"Integration test","category":"Computer Networks","publicationYear":2026},st,201)
 paper=created["paper"];pid=paper["id"];assert paper["title"]=="API Test Paper" and paper["status"]=="Pending"
 req("POST",f"/api/papers/{pid}/reviews",{"decision":"Approved","comments":"forbidden"},st,403)
 req("PATCH",f"/api/papers/{pid}/status",{"status":"Approved"},st,403)
 _,faculty=req("POST","/api/login",{"email":"faculty@example.test","password":"faculty-test-pass-123"},expected=200)
 ft=faculty["token"]
 req("PATCH",f"/api/papers/{pid}/status",{"status":"Approved"},ft,403)
 req("POST",f"/api/papers/{pid}/reviews",{"decision":"Approved","comments":"Review test passed"},ft,201)
 _,reviews=req("GET",f"/api/papers/{pid}/reviews",token=ft,expected=200)
 assert len(reviews["reviews"])==1 and reviews["reviews"][0]["decision"]=="Approved"
 _,admin=req("POST","/api/login",{"email":"admin@example.test","password":"admin-test-pass-123"},expected=200)
 at=admin["token"]
 req("PATCH",f"/api/papers/{pid}/status",{"status":"Rejected"},at,200)
 req("PATCH",f"/api/papers/{pid}/status",{"status":"NotAStatus"},at,400)
 req("POST","/api/logout",token=st,expected=200)
 req("POST","/api/papers",{"title":"After logout","category":"Computer Networks"},st,401)
 _,listing=req("GET","/api/papers",expected=200)
 assert len(listing["papers"])==1 and listing["papers"][0]["status"]=="Rejected"
 print("HTTP API smoke tests passed.")
finally:
 if proc:
  proc.terminate()
  try:proc.wait(timeout=5)
  except subprocess.TimeoutExpired:proc.kill();proc.wait(timeout=5)
 for suffix in ("","-wal","-shm"):
  try:os.remove(db+suffix)
  except FileNotFoundError:pass
