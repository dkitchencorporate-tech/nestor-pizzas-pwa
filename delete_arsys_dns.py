import requests
import base64

url = "https://api.servidoresdns.net:54321/hosting/api/soap/index.php"
headers = {'content-type': 'text/xml'}

auth_string = "businesspymes2020@gmail.com:[REDACTED]."
auth_base64 = base64.b64encode(auth_string.encode('utf-8')).decode('utf-8')
headers['Authorization'] = f"Basic {auth_base64}"

def get_soap_body(action, domain, dns, record_type, value):
    return f"""<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <{action} xmlns="{action}">
      <input>
        <domain>{domain}</domain>
        <dns>{dns}</dns>
        <type>{record_type}</type>
        <value>{value}</value>
      </input>
    </{action}>
  </soap:Body>
</soap:Envelope>"""

def delete_record(dns, record_type, value):
    body = get_soap_body('DeleteDNSEntry', 'nestorpizzas.es', dns, record_type, value)
    response = requests.post(url, data=body, headers=headers)
    print(f"Delete {dns} -> {value}: {response.status_code}")
    print(response.text)

delete_record('nestorpizzas.es', 'NS', 'dns97.servidoresdns.net.')
delete_record('nestorpizzas.es', 'NS', 'dns98.servidoresdns.net.')
