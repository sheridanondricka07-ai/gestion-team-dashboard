import urllib.request
import json

def test():
    spam = json.loads(urllib.request.urlopen('https://gestion-team-e-default-rtdb.firebaseio.com/state/spamhaus.json').read().decode())
    servers = json.loads(urllib.request.urlopen('https://gestion-team-e-default-rtdb.firebaseio.com/state/servers.json').read().decode())
    vmta = json.loads(urllib.request.urlopen('https://gestion-team-e-default-rtdb.firebaseio.com/state/vmtaResults.json').read().decode()) or {}
    
    lines = []
    for s in servers:
        if not s: continue
        ip_statuses = []
        for ip in s.get('allIps', []):
            sh = spam.get(ip.replace('.', '_')) or {'status': 'clean'}
            vm = vmta.get(ip.replace('.', '_')) or {'status': 'OK', 'ptr': 'N/A'}
            sh_status = 'LISTED on ' + sh.get('list', '') if sh.get('status') == 'listed' else 'clean'
            ip_statuses.append(f"{ip} (Spamhaus: {sh_status}, VMTA/PTR: {vm.get('status')})")
        lines.append(f"- Name: {s.get('name')}, Main IP: {s.get('ip', 'N/A')}, Status: {s.get('status', 'active')}, IPs: [{ ', '.join(ip_statuses) }]")
    
    formatted_servers = '\n'.join(lines)
    print("Chars length of formatted servers:", len(formatted_servers))
    print("Occurrences of 'LISTED' in formatted_servers:", formatted_servers.count('LISTED'))

if __name__ == '__main__':
    test()
