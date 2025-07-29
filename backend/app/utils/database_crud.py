from typing import TypeVar, Generic, Type, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from sqlalchemy.ext.declarative import DeclarativeMeta
from ..core.database.connection import Base

ModelType = TypeVar("ModelType", bound=DeclarativeMeta)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """Base CRUD operations for database models"""
    
    def __init__(self, model: Type[ModelType]):
        self.model = model

    def get(self, db: Session, id: int) -> Optional[ModelType]:
        """Get a single record by ID"""
        return db.query(self.model).filter(self.model.id == id).first()

    def get_multi(
        self, 
        db: Session, 
        *, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[ModelType]:
        """Get multiple records with pagination"""
        return db.query(self.model).offset(skip).limit(limit).all()

    def create(self, db: Session, *, obj_in: CreateSchemaType) -> ModelType:
        """Create a new record"""
        obj_data = obj_in.model_dump()
        db_obj = self.model(**obj_data)
        db.add(db_obj)
        try:
            db.commit()
            db.refresh(db_obj)
            return db_obj
        except IntegrityError as e:
            db.rollback()
            raise ValueError(f"Database integrity error: {str(e)}")

    def update(
        self,
        db: Session,
        *,
        db_obj: ModelType,
        obj_in: UpdateSchemaType
    ) -> ModelType:
        """Update an existing record"""
        obj_data = obj_in.model_dump(exclude_unset=True)
        for field, value in obj_data.items():
            setattr(db_obj, field, value)
        
        try:
            db.commit()
            db.refresh(db_obj)
            return db_obj
        except IntegrityError as e:
            db.rollback()
            raise ValueError(f"Database integrity error: {str(e)}")

    def delete(self, db: Session, obj: ModelType) -> Optional[ModelType]:
        """Delete a record by ORM object"""
        db.delete(obj)
        db.commit()
        return obj

    def count(self, db: Session) -> int:
        """Count total records"""
        return db.query(self.model).count()


class DatabaseManager:
    """Database manager for common operations"""
    
    @staticmethod
    def validate_foreign_key(db: Session, model: Type[ModelType], key_id: int) -> bool:
        """Validate that a foreign key exists"""
        if key_id is None:
            return True
        return db.query(model).filter(model.id == key_id).first() is not None

    @staticmethod
    def get_or_create(
        db: Session, 
        model: Type[ModelType], 
        **kwargs
    ) -> tuple[ModelType, bool]:
        """Get an existing record or create a new one"""
        instance = db.query(model).filter_by(**kwargs).first()
        if instance:
            return instance, False
        else:
            instance = model(**kwargs)
            db.add(instance)
            try:
                db.commit()
                db.refresh(instance)
                return instance, True
            except IntegrityError:
                db.rollback()
                # Try to get again in case another thread created it
                instance = db.query(model).filter_by(**kwargs).first()
                if instance:
                    return instance, False
                raise