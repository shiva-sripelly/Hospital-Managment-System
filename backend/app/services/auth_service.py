from sqlalchemy import String, cast, or_, select
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.auth import UserCreate, UserUpdate
from app.utils.security import hash_password, verify_password


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def list_users(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
) -> list[User]:
    query = select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
    if search:
        search_term = f"%{search.strip()}%"
        query = (
            select(User)
            .where(
                or_(
                    User.full_name.ilike(search_term),
                    User.email.ilike(search_term),
                    cast(User.role, String).ilike(search_term),
                )
            )
            .order_by(User.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
    return list(db.scalars(query))


def create_user(db: Session, user_data: UserCreate) -> User:
    user = User(
        full_name=user_data.full_name.strip(),
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user_password(db: Session, user: User, new_password: str) -> User:
    user.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user: User, user_data: UserUpdate) -> User:
    data = user_data.model_dump(exclude_unset=True)
    password = data.pop("password", None)
    for field, value in data.items():
        setattr(user, field, value)
    if password:
        user.password_hash = hash_password(password)

    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.password_hash):
        return None
    return user
