from .. import schemas
import pytest
from ..config import settings
from jose import jwt
from ..oauth2 import create_access_token
from .. import models








def test_get_all_posts(authorized_client, test_posts):
    res = authorized_client.get("/posts/")
    assert len(res.json()) == len(test_posts)
    assert res.status_code == 200
