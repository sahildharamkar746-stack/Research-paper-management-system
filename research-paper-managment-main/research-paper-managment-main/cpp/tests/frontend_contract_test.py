#!/usr/bin/env python3
"""Static contract checks for frontend authentication and C++ API wiring."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]

def require(condition, message):
    if not condition:
        raise AssertionError(message)

api = (ROOT / "js/api.js").read_text(encoding="utf-8")
auth = (ROOT / "js/auth.js").read_text(encoding="utf-8")
login = (ROOT / "login.html").read_text(encoding="utf-8")
register = (ROOT / "register.html").read_text(encoding="utf-8")
data = (ROOT / "js/data.js").read_text(encoding="utf-8")

require("http://127.0.0.1:8080" in api, "API base URL default missing")
for page in (ROOT / "add-paper.html", ROOT / "admin.html", ROOT / "categories.html", ROOT / "dashboard.html", ROOT / "index.html", ROOT / "my-papers.html", ROOT / "paper-details.html", ROOT / "papers.html", ROOT / "profile.html", ROOT / "researchers.html", ROOT / "reviews.html"):
    source = page.read_text(encoding="utf-8")
    require(source.index('<script src="js/api.js"></script>') < source.index('<script src="js/data.js"></script>'), page.name + " must load API before data layer")
for endpoint in ("/health", "/api/login", "/api/register", "/api/logout", "/api/papers", "/api/categories"):
    require(endpoint in api, "API client endpoint missing: " + endpoint)
require("await rpmsApi.login" in auth, "Login must call the C++ API")
require("await rpmsApi.register" in auth, "Registration must call the C++ API")
require("localStorage.getItem('rpms_api_token')" in auth, "Session must require API token")
require("await login(email, password)" in login, "Login form must await server response")
require("await register({" in register, "Registration form must await server response")
require('<script src="js/api.js"></script>' in login and '<script src="js/api.js"></script>' in register, "Auth pages must load API client")
require('<option value="Faculty">' not in register, "Public registration must not offer Faculty role")
require("admin123" not in login and "faculty123" not in login and "student123" not in login, "Demo passwords must not be embedded in login page")
require(not re.search(r"password:\s*'[^']+'", data), "Plaintext passwords must not ship in frontend data")
if len(sys.argv) > 1:
    node = sys.argv[1]
    for file in (ROOT / "js/api.js", ROOT / "js/auth.js"):
        subprocess.run([node, "--check", str(file)], check=True, timeout=10)
    for page in (ROOT / "login.html", ROOT / "register.html"):
        for index, script in enumerate(re.findall(r"<script>(.*?)</script>", page.read_text(encoding="utf-8"), re.I | re.S)):
            temp = Path(__file__).with_name("." + page.stem + "_inline_" + str(index) + ".js")
            try:
                temp.write_text(script, encoding="utf-8")
                subprocess.run([node, "--check", str(temp)], check=True, timeout=10)
            finally:
                temp.unlink(missing_ok=True)
print("Frontend API integration contract checks passed.")
