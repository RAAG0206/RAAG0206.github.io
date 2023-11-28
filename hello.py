from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
from flask_pymongo import PyMongo
from pymongo import MongoClient

app = Flask(__name__)

CORS(app)

directory="front/dist"

client = MongoClient("mongodb+srv://Chamax:chameadores@cluster0.onh5ksw.mongodb.net/?retryWrites=true&w=majority")

@app.route('/get_data')
def get_data():
    db = client["prueba1"]
    data_collection = db["2"]
    data = data_collection.find({})
    result = []
    for document in data:
        
        result.append({
            'name': document['name'],
            'email': document['email'],
        })
    
    print(result)
    return jsonify(result)

@app.route('/', methods=['GET', 'POST'])
def index():
    path=directory
    if request.method == 'GET':
        return send_from_directory(directory=path, path='index.html')  
    else:
        return send_from_directory(directory=path, path='index.html')

@app.route('/home', methods=['GET'])
def home():
    path=directory
    if request.method == 'GET':
        return send_from_directory(directory=path, path='index.html')  
    else:
        return send_from_directory(directory=path, path='index.html')

@app.route('/assets/<file>')
def css(file):
    return send_from_directory(directory=directory + "/assets", path=f"{file}")