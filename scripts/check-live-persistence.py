"""Create fictional records before deployment, then verify their original IDs afterward.

The checkpoint contains test credentials. Keep it private, outside the repository,
and delete it after verification. This script never reads other companies' data.
"""
import argparse
import json
import os
from pathlib import Path
import secrets
import urllib.error
import urllib.request

API = 'https://bizcore-api-e7is.onrender.com/api'
p = argparse.ArgumentParser()
p.add_argument('phase', choices=['prepare', 'verify'])
p.add_argument('--checkpoint', required=True, type=Path)
args = p.parse_args()

def request(path, data=None, token=None, expected=200):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(API + path, data=json.dumps(data).encode() if data is not None else None, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            if response.status != expected:
                raise RuntimeError('Unexpected status')
            return json.load(response)
    except urllib.error.HTTPError as err:
        raise RuntimeError(f'{path}: HTTP {err.code}') from None

if args.phase == 'prepare':
    # Exclusive create prevents overwriting a checkpoint from an earlier deployment.
    fd = os.open(args.checkpoint, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as f:
        suffix = secrets.token_hex(4)
        state = {'email': f'persistence-{suffix}@example.com', 'password': 'Test-' + secrets.token_urlsafe(20) + 'A1!'}
        auth = request('/auth/register', {**state, 'companyName': f'Persistence Check {suffix}', 'firstName': 'Test', 'lastName': 'Only'}, expected=201)
        dept = request('/hr/departments', {'name': f'Before deploy {suffix}'}, auth['accessToken'], 201)
        state.update(userId=auth['user']['id'], companyId=auth['user']['companyId'], departmentId=dept['id'], departmentName=dept['name'])
        json.dump(state, f)
    print('PASS: fictional account and department saved before deployment', flush=True)
else:
    state = json.loads(args.checkpoint.read_text())
    auth = request('/auth/login', {'email': state['email'], 'password': state['password']})
    assert auth['user']['id'] == state['userId'] and auth['user']['companyId'] == state['companyId']
    data = request('/hr/departments', token=auth['accessToken'])
    assert any(d['id'] == state['departmentId'] and d['name'] == state['departmentName'] for d in data['items'])
    print('PASS: existing account credentials and original record IDs survived deployment', flush=True)
