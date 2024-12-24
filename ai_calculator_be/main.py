from contextlib import asynccontextmanager
from fastapi import FastAPI #type: ignore 
from fastapi.middleware.cors import CORSMiddleware #type: ignore
import uvicorn #type: ignore
from constants import SERVER_URL, PORT, ENV
from apps.calculator.route import router as calculator_router
    
app = FastAPI()

origins = [
    "http://localhost:5173",  # React frontend URL
    "http://localhost",       # Allow localhost requests in case of other testing setups
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get('/')
async def health():
    return {'message': 'Server is running'}

app.include_router(calculator_router, prefix="/calculate", tags=["calculate"])

if __name__ == "__main__":
    uvicorn.run('main:app', host=SERVER_URL, port=int(PORT), reload=(ENV=='dev'))