#!/usr/bin/env python3
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

exe = sys.argv[1]
with socket.socket() as sock:
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
db_fd, db_path = tempfile.mkstemp(prefix="rpms_api_", suffix=".sqlite3")
os.close(db_fd)
os.unlink(db_path)
env = os.environ.copy()
env["RPMS_PORT"] = str(port)
proc = subprocess.Popen([exe, db_path], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

def request(method, path, body=None, token=None, expected=None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(f"http://127.0.0.1:{port}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=2) as response:
            status, payload = response.status, response.read().decode()
    except urllib.error.HTTPError as err:
        status, payload = err.code, err.read().decode()
    parsed = json.loads(payload) if payload else {}
    if expected is not None and status != expected:
        raise AssertionError(f"{method} {path}: expected {expected}, got {status}: {parsed}")
    return status, parsed

try:
    for _ in range(60):
        if proc.poll() is not None:
            raise RuntimeError("server exited before becoming ready: " + (proc.stderr.read() or ""))
        try:
            status, health = request("GET", "/health", expected=200)
            break
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            time.sleep(0.25)
    else:
        raise RuntimeError("server did not become ready")

    assert health["status"] == "ok"
    assert request("POST", "/api/papers", {"title":"Unauthenticated","category":"Computer Networks"}, expected=401)[0] == 401
    assert request("POST", "/api/register", {"name":"Test Student","email":"student@example.test","password":"correct-horse-123","role":"Student"}, expected=201)[0] == 201
    assert request("POST", "/api/register", {"name":"Admin Try","email":"admin@example.test","password":"correct-horse-123","role":"Admin"}, expected=403)[0] == 403
    assert request("POST", "/api/register", {"name":"Test Student","email":"student@example.test","password":"correct-horse-123","role":"Student"}, expected=409)[0] == 409
    _, login = request("POST", "/api/login", {"email":"STUDENT@example.test","password":"correct-horse-123"}, expected=200)
    token = login["token"]
    assert login["user"]["role"] == "Student"
    request("POST", "/api/login", {"email":"student@example.test","password":"bad-password"}, expected=401)
    _, categories = request("GET", "/api/categories", expected=200)
    assert "Computer Networks" in categories["categories"]
    _, created = request("POST", "/api/papers", {"title":"API Test Paper","abstract":"Integration test","category":"Computer Networks","publicationYear":2026}, token, expected=201)
    paper = created["paper"]
    assert paper["title"] == "API Test Paper" and paper["status"] == "Pending"
    request("POST", f"/api/papers/{paper['id']}/reviews", {"decision":"Approved","comments":"Should be forbidden"}, token, expected=403)
    request("PATCH", f"/api/papers/{paper['id']}/status", {"status":"Approved"}, token, expected=403)
    request("POST", "/api/logout", token=token, expected=200)
    request("POST", f"/api/papers", {"title":"After logout","category":"Computer Networks"}, token, expected=401)
    print("HTTP API smoke tests passed.")
finally:
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait(timeout=5)
    for suffix in ("", "-wal", "-shm"):
        try:
            os.remove(db_path + suffix)
        except FileNotFoundError:
            pass
