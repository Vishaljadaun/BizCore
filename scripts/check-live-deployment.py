"""Explicit live smoke check: creates one fictional company and employee per run."""
import json
import secrets
import urllib.error
import urllib.request

API = 'https://bizcore-api-e7is.onrender.com'
FRONTEND = 'https://bizcore-web.onrender.com'
checks = []


def request(path, method='GET', body=None, token=None, expected=200, headers=None):
    h = {'Content-Type': 'application/json', **(headers or {})}
    if token:
        h['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body is not None else None, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            status, raw, response_headers = response.status, response.read(), dict(response.headers)
    except urllib.error.HTTPError as error:
        status, raw, response_headers = error.code, error.read(), dict(error.headers)
    if status != expected:
        # Do not print response bodies: successful auth payloads contain tokens.
        raise RuntimeError(f'{method} {path}: expected {expected}, received {status}')
    return json.loads(raw) if raw else None, response_headers


def passed(name):
    checks.append(name)
    print('PASS: ' + name, flush=True)


with urllib.request.urlopen(FRONTEND, timeout=120) as response:
    assert response.status == 200 and b'<div id="root">' in response.read()
passed('Public frontend serves the React entry point')
request('/health')
passed('API health')
_, headers = request('/api/auth/login', 'OPTIONS', expected=204, headers={
    'Origin': FRONTEND, 'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'content-type'})
assert next((v for k, v in headers.items() if k.lower() == 'access-control-allow-origin'), None) == FRONTEND
passed('CORS permits the deployed frontend')
suffix = secrets.token_hex(4)
password = 'Preview-' + secrets.token_urlsafe(20) + 'Aa1!'
admin_email = f'check-admin-{suffix}@example.com'
employee_email = f'check-employee-{suffix}@example.com'
auth, _ = request('/api/auth/register', 'POST', {
    'companyName': 'Deployment Check ' + suffix, 'firstName': 'Preview',
    'lastName': 'Admin', 'email': admin_email, 'password': password}, expected=201)
passed('Company registration')
auth, _ = request('/api/auth/login', 'POST', {'email': admin_email, 'password': password})
admin_token = auth['accessToken']
passed('Admin login')
department, _ = request('/api/hr/departments', 'POST', {'name': 'Engineering', 'description': 'Fictional deployment verification'}, admin_token, 201)
employee, _ = request('/api/hr/employees', 'POST', {
    'firstName': 'Preview', 'lastName': 'Employee', 'email': employee_email,
    'designation': 'Engineer', 'departmentId': department['id'],
    'joiningDate': '2026-01-01', 'salary': 50000}, admin_token, 201)
user, _ = request('/api/users', 'POST', {'firstName': 'Preview', 'lastName': 'Employee', 'email': employee_email, 'password': password, 'role': 'Employee'}, admin_token, 201)
request('/api/hr/employees/' + employee['id'] + '/link-user', 'POST', {'userId': user['id']}, admin_token)
passed('Department, employee and login access')
auth, _ = request('/api/auth/login', 'POST', {'email': employee_email, 'password': password})
employee_token = auth['accessToken']
profile, _ = request('/api/hr/employees/me', token=employee_token)
assert profile['id'] == employee['id']
request('/api/hr/employees/clock-in', 'POST', token=employee_token)
request('/api/hr/employees/clock-out', 'POST', token=employee_token)
attendance, _ = request('/api/hr/employees/attendance', token=admin_token)
assert any(row['employeeId'] == employee['id'] and row['clockOut'] for row in attendance['items'])
passed('Employee profile, clock-in/out and admin attendance')
request('/api/hr/employees/' + employee['id'] + '/link-user', 'DELETE', token=admin_token)
request('/api/hr/employees/clock-in', 'POST', token=employee_token, expected=404)
passed('Revocation blocks the existing employee token')
print(json.dumps({'passed': len(checks), 'fictionalCompany': 'Deployment Check ' + suffix}))
