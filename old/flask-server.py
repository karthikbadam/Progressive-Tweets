import json
import sys
import time
from flask import Flask, request, send_from_directory
from flask_socketio import SocketIO, send, emit
from TwitterSearch import *

app = Flask(__name__)
socketio = SocketIO(app)

# set the project root directory as the static folder, you can set others.
# app = Flask(__name__, static_url_path='')

## app routing definitions
@app.route('/')
def root():
    return app.send_static_file('sentiment.html')

@app.route('/load')
def load():
    return app.send_static_file('load.html')

@app.route('/sentiment')
def sentiment():
    return app.send_static_file('sentiment.html')

@app.route('/topic')
def topic():
    return app.send_static_file('topic.html')

@app.route('/js/<path:path>')
def send_js(path):
    return send_from_directory('public/js', path)

@app.route('/css/<path:path>')
def send_css(path):
    return send_from_directory('public/css', path)

@app.route('/data/<path:path>')
def send_data(path):
    return send_from_directory('public/data', path)

@app.route('/images/<path:path>')
def send_images(path):
    return send_from_directory('public/images', path)

@app.route('/fonts/<path:path>')
def send_fonts(path):
    return send_from_directory('public/fonts', path)

    @socketio.on('message')
    def handle_message(message):
        print('received message: ' + message)


## socket.io routing definitions
@socketio.on('my event')
def handle_my_custom_event(json):
    print('received json: ' + str(json))

# @socketio.on('message')
# def handle_message(message):
#     send(message)
#
# @socketio.on('json')
# def handle_json(json):
#     send(json, json=True)
#
# @socketio.on('my event')
# def handle_my_custom_event(json):
#     emit('my response', json)

if __name__ == "__main__":
    socketio.run(app)
