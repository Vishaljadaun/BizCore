"""Explicit live smoke check: creates one fictional company and employee per run."""
from datetime import date, datetime, timedelta, timezone
import json
import secrets
import urllib.error
import urllib.request

API = 'https://bizcore-api-e7is.onrender.com'
FRONTEND = 'https://bizcore-web.onrender.com'
checks = []


def request(path, method='GET', body=None, token=None, expected=200, headers=None, raw_response=False):
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
    return (raw if raw_response else json.loads(raw) if raw else None), response_headers


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
policy, _ = request('/api/hr/leave/types', 'POST', {'name': 'Annual leave', 'daysAllowed': 10}, admin_token, 201)
leave_date = date(datetime.now(timezone.utc).year + 1, 1, 5)
while leave_date.weekday() >= 5:
    leave_date += timedelta(days=1)
leave, _ = request('/api/hr/employees/' + employee['id'] + '/apply-leave', 'POST', {
    'leaveTypeId': policy['id'], 'startDate': leave_date.isoformat(),
    'endDate': leave_date.isoformat(), 'reason': 'Fictional deployment verification'}, employee_token, 201)
balances_path = '/api/hr/employees/' + employee['id'] + '/leave-balances?year=' + str(leave_date.year)
balances, _ = request(balances_path, token=employee_token)
assert balances[0]['pendingDays'] == 1 and balances[0]['availableDays'] == 9
request('/api/hr/leave/' + leave['id'] + '/approve', 'PUT', token=employee_token, expected=403)
request('/api/hr/leave/' + leave['id'] + '/approve', 'PUT', token=admin_token)
request('/api/hr/leave/' + leave['id'] + '/approve', 'PUT', token=admin_token, expected=409)
balances, _ = request(balances_path, token=employee_token)
assert balances[0]['usedDays'] == 1 and balances[0]['pendingDays'] == 0
history, _ = request('/api/hr/leave', token=employee_token)
assert history['items'][0]['status'] == 'Approved' and history['items'][0]['approvedByName'] == 'Preview Admin'
passed('Leave policy, application, reservation, authorized review and duplicate protection')
overview, _ = request('/api/hr/overview', token=admin_token)
assert overview['scope'] == 'company' and overview['activeEmployees'] == 1 and overview['clockInsToday'] == 1
passed('Dashboard uses stored company data')
today = datetime.now(timezone.utc).date().isoformat()
csv, _ = request('/api/hr/attendance/export?from=' + today + '&to=' + today, token=admin_token, raw_response=True)
assert b'Preview Employee' in csv and b'Clock in (UTC)' in csv
passed('Attendance CSV export')
request('/api/hr/employees/' + employee['id'] + '/link-user', 'DELETE', token=admin_token)
request('/api/hr/employees/clock-in', 'POST', token=employee_token, expected=404)
passed('Revocation blocks the existing employee token')
# Exercise the connected modules in the same fictional company.
from uuid import uuid4

def ops(path, method='GET', body=None, token=None, expected=200):
    return request('/api/operations/' + path, method, body, token or admin_token, expected)[0]

project = ops('projects', 'POST', {'name': 'Preview office setup', 'description': 'Deployment verification', 'dueDate': None}, expected=201)
task = ops('tasks', 'POST', {'projectId': project['id'], 'title': 'Inspect delivery', 'description': '', 'assignedUserId': user['id'], 'dueDate': None, 'priority': 'Medium'}, expected=201)
ops('tasks/' + task['id'] + '/status', 'PUT', {'status': 'InProgress'}, employee_token)
ops('time-entries', 'POST', {'taskId': task['id'], 'date': today, 'minutes': 15, 'note': 'Fictional inspection'}, employee_token, 201)
ops('tasks/' + task['id'] + '/status', 'PUT', {'status': 'Done'}, employee_token)
ops('projects/' + project['id'] + '/status', 'PUT', {'status': 'Completed'})
assert ops('time-entries')['items'][0]['minutes'] == 15
passed('Projects, assigned employee tasks and stored time logs')
vendor_email = 'check-vendor-' + suffix + '@example.com'
vendor, _ = request('/api/users', 'POST', {'firstName': 'Preview', 'lastName': 'Vendor', 'email': vendor_email, 'password': password, 'role': 'Vendor'}, admin_token, 201)
supplier = ops('suppliers', 'POST', {'name': 'Preview supplier', 'email': vendor_email, 'phone': '', 'address': '', 'portalUserId': vendor['id'], 'isActive': True}, expected=201)
contract = ops('contracts', 'POST', {'supplierId': supplier['id'], 'title': 'Preview supply agreement', 'terms': 'Fictional test agreement', 'startDate': today, 'endDate': today, 'value': 300}, expected=201)
ops('contracts/' + contract['id'] + '/status', 'PUT', {'status': 'Active'})
product = ops('products', 'POST', {'sku': 'PREVIEW-DESK', 'name': 'Preview desk', 'unit': 'units', 'reorderLevel': 2, 'unitCost': 100, 'isActive': True}, expected=201)
order = ops('orders', 'POST', {'supplierId': supplier['id'], 'expectedDate': None, 'notes': 'Fictional purchase', 'lines': [{'productId': product['id'], 'quantity': 3, 'unitCost': 100}]}, expected=201)
ops('orders/' + order['id'] + '/status', 'PUT', {'status': 'Placed'})
vendor_auth, _ = request('/api/auth/login', 'POST', {'email': vendor_email, 'password': password})
vendor_token = vendor_auth['accessToken']
assert ops('orders', token=vendor_token)['totalCount'] == 1
assert ops('contracts', token=vendor_token)['totalCount'] == 1
ops('orders/' + order['id'] + '/status', 'PUT', {'status': 'Acknowledged'}, vendor_token)
passed('Supplier contracts and linked vendor acknowledgment')
ops('orders/' + order['id'] + '/status', 'PUT', {'status': 'Received'})
ops('orders/' + order['id'] + '/status', 'PUT', {'status': 'Received'}, expected=409)
assert ops('products')['items'][0]['onHand'] == 3
assert ops('movements')['totalCount'] == 1
expense = ops('expenses')['items'][0]
assert expense['amount'] == 300 and expense['orderId'] == order['id']
passed('Purchase receipt creates stock and one expense; repeat blocked')
invoice = ops('invoices', 'POST', {'customerName': 'Preview customer', 'customerEmail': '', 'issueDate': today, 'dueDate': today, 'notes': '', 'taxPercent': 10, 'lines': [{'description': 'Preview service', 'quantity': 1, 'unitPrice': 1000}]}, expected=201)
ops('invoices/' + invoice['id'] + '/status', 'PUT', {'status': 'Issued'})
payment = {'amount': 500, 'date': today, 'reference': 'Preview external payment', 'requestId': str(uuid4())}
ops('invoices/' + invoice['id'] + '/payments', 'POST', payment, expected=201)
ops('invoices/' + invoice['id'] + '/payments', 'POST', payment, expected=201)
assert ops('invoices')['items'][0]['paid'] == 500
ops('expenses/' + expense['id'] + '/status', 'PUT', {'status': 'Paid', 'date': today})
report = ops('reports?from=' + today + '&to=' + today)
assert report['received'] == 500 and report['paidExpenses'] == 300 and report['netCashFlow'] == 200
csv, _ = request('/api/operations/reports/export?from=' + today + '&to=' + today, token=admin_token, raw_response=True)
assert b'Preview external payment' in csv and b'INR' in csv
ops('invoices', token=employee_token, expected=403)
ops('products', token=vendor_token, expected=403)
passed('Invoices, payment retry protection, paid expense, report, CSV and permissions')
print(json.dumps({'passed': len(checks), 'fictionalCompany': 'Deployment Check ' + suffix}))
