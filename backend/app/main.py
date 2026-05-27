from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.upload import router as upload_router

app = FastAPI(title="School Analytics API")
app.include_router(upload_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # later we can restrict this to your React app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "School Analytics API is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}