#!/usr/bin/env python3
import json, os, socket, subprocess, sys, tempfile, time, urllib.error, urllib.request
exe=sys.argv[1]
with socket.socket() as s:
 s.bind(("127.0.0.1",0)); port=s.getsockname()[1]
fd,db=tempfile.mkstemp(prefix="rpms_api_",suffix=".sqlite3"); os.close(fd); os.unlink(db)
env=os.environ.copy(); env["RPMS_PORT"]=str(port)
proc=subprocess.Popen([exe,db],env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
def req(method,path,body=None,token=None,expected=None):
 data=None if body is None else json.dumps(body).encode()
 headers={"Content-Type":"application/json"}
 if token: headers["Authorization"]="Bearer "+token
 request=urllib.request.Request(f"http://127.0.0.1:{port}{path}",data=data,headers=headers,method=method)
 try:
  with urllib.request.urlopen(request,timeout=2) as r: status,payload=r.status,r.read().decode()
 except urllib.error.HTTPError as e: status,payload=e.code,e.read().decode()
 result=json.loads(payload) if payload else {}
 if expected is not None and status!=expected: raise AssertionError(f"{method} {path}: expected {expected}, got {status}: {result}")
 return status,result
try:
 for _ in range(60):
  if proc.poll() is not None: raise RuntimeError("server exited: "+(proc.stderr.read() or ""))
  try: _,health=req("GET","/health",expected=200); break
  except (urllib.error.URLError,TimeoutError,ConnectionError): time.sleep(.25)
 else: raise RuntimeError("server did not become ready")
 assert health["status"]=="ok"
 req("POST","/api/papers",{"title":"No auth","category":"Computer Networks"},expected=401)
 req("POST","/api/register",{"name":"Test Student","email":"student@example.test","password":"correct-horse-123","role":"Student"},expected=201)
 req("POST","/api/register",{"name":"Admin Try","email":"admin@example.test","password":"correct-horse-123","role":"Admin"},expected=403)
 req("POST","/api/register",{"name":"Test Student","email":"student@example.test","password":"correct-horse-123","role":"Student"},expected=409)
 _,login=req("POST","/api/login",{"email":"STUDENT@example.test","password":"correct-horse-123"},expected=200)
 token=login["token"]; assert login["user"]["role"]=="Student"
 req("POST","/api/login",{"email":"student@example.test","password":"bad-password"},expected=401)
 _,cats=req("GET","/api/categories",expected=200); assert "Computer Networks" in cats["categories"]
 _,created=req("POST","/api/papers",{"title":"API Test Paper","abstract":"Integration test","category":"Computer Networks","publicationYear":2026},token,201)
 paper=created["paper"]; assert paper["title"]=="API Test Paper" and paper["status"]=="Pending"
 req("POST",f"/api/papers/{paper['id']}/reviews",{"decision":"Approved","comments":"forbidden"},token,403)
 req("PATCH",f"/api/papers/{paper['id']}/status",{"status":"Approved"},token,403)
 req("POST","/api/logout",token=token,expected=200)
 req("POST","/api/papers",{"title":"After logout","category":"Computer Networks"},token,401)
 print("HTTP API smoke tests passed.")
finally:
 proc.terminate()
 try: proc.wait(timeout=5)
 except subprocess.TimeoutExpired: proc.kill(); proc.wait(timeout=5)
 for suffix in ("","-wal","-shm"):
  try: os.remove(db+suffix)
  except FileNotFoundError: pass
