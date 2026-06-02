🚀 FastAPI Backend Project

A modern backend API built with FastAPI, featuring authentication, database integration, and modular architecture. This project demonstrates real-world backend engineering concepts including CRUD operations, user authentication, relationships, and scalable project structure.

📦 Features
User authentication (JWT-based login system)
Secure password hashing
CRUD operations for posts
Voting system (like/upvote functionality)
SQLAlchemy ORM integration
PostgreSQL database support
Alembic migrations
Modular router structure (auth, users, posts, votes)
Environment variable configuration (.env support)
API documentation via Swagger UI
🏗️ Tech Stack
Python 3.10+
FastAPI
PostgreSQL
SQLAlchemy
Alembic
Pydantic
OAuth2 + JWT
Uvicorn
📁 Project Structure
app/
│
├── main.py
├── database.py
├── models/
├── schemas/
├── routers/
│   ├── auth.py
│   ├── users.py
│   ├── posts.py
│   └── votes.py
├── utils/
└── config/
⚙️ Installation & Setup
1. Clone the repository
git clone https://github.com/your-username/fastapi-project.git
cd fastapi-project
2. Create virtual environment
python -m venv venv
source venv/bin/activate   # Mac/Linux
venv\Scripts\activate      # Windows
3. Install dependencies
pip install -r requirements.txt
4. Setup environment variables

Create a .env file:

DATABASE_URL=postgresql://user:password@localhost:5432/dbname
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
🗄️ Run database migrations
alembic upgrade head
▶️ Run the server
uvicorn app.main:app --reload
📍 API Documentation

Once running, visit:

Swagger UI: http://127.0.0.1:8000/docs
ReDoc: http://127.0.0.1:8000/redoc
🔐 Authentication Flow
Register a user
Login to receive JWT token
Use token in Authorization header:
Bearer <your_token>
🧠 What I learned building this
How real backend systems are structured
How authentication works under the hood
How relational databases connect to APIs
How to design scalable FastAPI projects
How to manage migrations and schema changes
🚧 Future Improvements
Docker containerization
Unit & integration testing
CI/CD pipeline
Cloud deployment
Rate limiting
File upload system
📜 License

This project is for educational and portfolio purposes.
