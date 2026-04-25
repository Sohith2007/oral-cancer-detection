import requests
import json
from io import BytesIO
from PIL import Image

# create dummy image
img = Image.new('RGB', (100, 100), color = 'red')
buf = BytesIO()
img.save(buf, format='JPEG')
img_bytes = buf.getvalue()

files = {
    'histo_image': ('dummy.jpg', img_bytes, 'image/jpeg')
}

data = {
    'clinical_data': json.dumps({"patient_id": 1, "symptoms": {"age": "50"}})
}
headers = {
    'Authorization': 'Bearer mock_token_for_dev'
}

try:
    response = requests.post('http://127.0.0.1:8000/api/analyze', data=data, files=files, headers=headers)
    print(response.status_code)
    print(response.json())
except Exception as e:
    print(e)
