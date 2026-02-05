from flask import Flask
from flask_socketio import SocketIO
from .routes.health import health_bp

socketio = SocketIO(cors_allowed_origins="*")


def create_app():
    app = Flask(__name__)
    app.config.from_mapping(SECRET_KEY="change_me")

    app.register_blueprint(health_bp)
    socketio.init_app(app)

    return app
