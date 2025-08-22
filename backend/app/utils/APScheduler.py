# from apscheduler.schedulers.background import BackgroundScheduler
# from sqlalchemy.orm import Session

# from alert_service import AlertService
# from core.database.connection import get_db

# alert_service = AlertService(firebase_service=firebase_service)

# def scheduled_token_cleanup():
#     db: Session = next(get_db())
#     alert_service.cleanup_invalid_tokens_from_db(db)
#     db.close()

# scheduler = BackgroundScheduler()
# scheduler.add_job(scheduled_token_cleanup, 'interval', hours=1)  # run every 1 hour
# scheduler.start()
