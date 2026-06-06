from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class School(Base):
    __tablename__ = "schools"

    id = Column(Integer, primary_key=True, index=True)
    school_name = Column(String(255), nullable=False)
    school_code = Column(String(100), unique=True, nullable=False, index=True)
    address = Column(Text, nullable=True)
    contact_person = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    status = Column(String(50), default="Active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    students = relationship("Student", back_populates="school", cascade="all, delete-orphan")
    tests = relationship("Test", back_populates="school", cascade="all, delete-orphan")
    analytics = relationship("AnalyticsResult", back_populates="school", cascade="all, delete-orphan")

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    roll_no = Column(String(100), nullable=False, index=True)
    student_name = Column(String(255), nullable=False)
    class_name = Column(String(100), nullable=True)
    section = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    school = relationship("School", back_populates="students")
    analytics = relationship("AnalyticsResult", back_populates="student", cascade="all, delete-orphan")

class Test(Base):
    __tablename__ = "tests"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)

    exam_type = Column(String(20), nullable=False, default="NEET")  # NEW

    test_type = Column(String(50), nullable=False)
    test_number = Column(Integer, nullable=False)
    test_name = Column(String(100), nullable=False)
    test_date = Column(Date, nullable=True)
    status = Column(String(50), default="Pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    school = relationship("School", back_populates="tests")
    uploads = relationship("Upload", back_populates="test", cascade="all, delete-orphan")
    analytics = relationship("AnalyticsResult", back_populates="test", cascade="all, delete-orphan")
    
class Upload(Base):
    __tablename__ = "uploads"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id", ondelete="CASCADE"), nullable=False)
    file_type = Column(String(100), nullable=False) # error_report, mark_list, blueprint
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    test = relationship("Test", back_populates="uploads")

class AnalyticsResult(Base):
    __tablename__ = "analytics_results"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    test_id = Column(Integer, ForeignKey("tests.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    
    physics = Column(Float, nullable=True, default=0.0)
    chemistry = Column(Float, nullable=True, default=0.0)
    maths = Column(Float, nullable=True, default=0.0)
    total_score = Column(Float, nullable=True, default=0.0)
    percentage = Column(Float, nullable=True, default=0.0)
    accuracy = Column(Float, nullable=True, default=0.0)
    rank = Column(Integer, nullable=True)
    
    # Extra fields for the existing engine to function optimally
    attempted = Column(Integer, nullable=True, default=0)
    correct = Column(Integer, nullable=True, default=0)
    wrong = Column(Integer, nullable=True, default=0)
    negative_marks = Column(Integer, nullable=True, default=0)
    band = Column(String(50), nullable=True)
    risk_exp_best = Column(String(50), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    school = relationship("School", back_populates="analytics")
    test = relationship("Test", back_populates="analytics")
    student = relationship("Student", back_populates="analytics")
