from app import schemas
import pytest
from app.config import settings
from jose import jwt




def test_create_user(client):
    res = client.post("/users/" , json={"email": "tesdfsfgfdgdfting@gmail.com","password": "test123"})
    new_user=schemas.UserOut(**res.json())
    assert res.status_code == 201
    assert new_user.email == "tesdfsfgfdgdfting@gmail.com"





def test_login(client , test_user):
    res = client.post("/login" , data={"username": test_user["email"],"password": test_user['password']})

    print(res.json())
    login_res = schemas.Token(**res.json())
    payload = jwt.decode(login_res.token , settings.secret_key , algorithms= [settings.algorithm])
    id = payload.get("user_id")
    
    assert res.status_code == 200
    assert login_res.token_type == 'bearer'
    assert id == test_user['id']

@pytest.mark.parametrize("email , password , status_code", [
    ("wrongemail@gmail.com","password123",403),
    ("dylr540@gmail.com","worngpassword", 403),
    ("wrongemail@gmail.com","wrongpassword",403),
    (None , "password123",422),
    ("dylr540@gmail.com",None,422)
])
def test_incorrect_login(client,email , password , status_code ):
    res = client.post("/login" , data={"username":email , "password":password})

    assert res.status_code == status_code
    # assert res.json().get("detail") == "Invalid Credentials"

