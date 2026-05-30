from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from typing import Optional, List

# ----------------------------------------------------
# SCHOOL SCHEMAS
# ----------------------------------------------------
class SchoolBase(BaseModel):
    school_name: str
    school_code: str
    address: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = "Active"

class SchoolCreate(SchoolBase):
    pass

class SchoolUpdate(BaseModel):
    school_name: Optional[str] = None
    school_code: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None

class SchoolResponse(SchoolBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ----------------------------------------------------
# STUDENT SCHEMAS
# ----------------------------------------------------
class StudentBase(BaseModel):
    school_id: int
    roll_no: str
    student_name: str
    class_name: Optional[str] = None
    section: Optional[str] = None

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    student_name: Optional[str] = None
    class_name: Optional[str] = None
    section: Optional[str] = None

class StudentResponse(StudentBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ----------------------------------------------------
# TEST SCHEMAS
# ----------------------------------------------------
class TestBase(BaseModel):
    school_id: int
    test_type: str
    test_number: int
    test_name: str
    test_date: Optional[date] = None
    status: Optional[str] = "Pending"

class TestCreate(BaseModel):
    test_type: str
    test_number: int

class TestUpdate(BaseModel):
    test_type: Optional[str] = None
    test_number: Optional[int] = None
    test_name: Optional[str] = None
    test_date: Optional[date] = None
    status: Optional[str] = None

class TestResponse(TestBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ----------------------------------------------------
# UPLOAD SCHEMAS
# ----------------------------------------------------
class UploadBase(BaseModel):
    test_id: int
    file_type: str
    file_name: str
    file_path: str

class UploadCreate(UploadBase):
    pass

class UploadResponse(UploadBase):
    id: int
    uploaded_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ----------------------------------------------------
# ANALYTICS RESULT SCHEMAS
# ----------------------------------------------------
class AnalyticsResultBase(BaseModel):
    school_id: int
    test_id: int
    student_id: int
    physics: Optional[float] = 0.0
    chemistry: Optional[float] = 0.0
    maths: Optional[float] = 0.0
    total_score: Optional[float] = 0.0
    percentage: Optional[float] = 0.0
    accuracy: Optional[float] = 0.0
    rank: Optional[int] = None
    attempted: Optional[int] = 0
    correct: Optional[int] = 0
    wrong: Optional[int] = 0
    negative_marks: Optional[int] = 0
    band: Optional[str] = None
    risk_exp_best: Optional[str] = None

class AnalyticsResultCreate(AnalyticsResultBase):
    pass

class AnalyticsResultResponse(AnalyticsResultBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AnalyticsResultWithStudent(AnalyticsResultResponse):
    student: StudentResponse
    model_config = ConfigDict(from_attributes=True)

class SchoolWithCounts(SchoolResponse):
    student_count: int = 0
    test_count: int = 0
    model_config = ConfigDict(from_attributes=True)
