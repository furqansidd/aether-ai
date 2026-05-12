import requests
res = requests.post("http://localhost:8000/chat", json={
    "file_path": "1778604445310_Titanic-Dataset.csv",
    "message": "tell me how many people survived"
})
print(res.status_code)
print(res.text)
