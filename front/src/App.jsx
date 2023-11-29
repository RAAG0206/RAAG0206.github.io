import { useState, useRef, useEffect } from 'react'
import './App.css'
import * as tf from '@tensorflow/tfjs'
import * as tfjsWebgl from '@tensorflow/tfjs-backend-webgl'
import * as poseDetection from '@tensorflow-models/pose-detection'
import Webcam from 'react-webcam'
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';

/*
[
    {
        "y": 150.25054931640628,
        "x": 330.35396575927734,
        "score": 0.6607863903045654,
        "name": "nose"
    },
    {
        "y": 124.56676483154297,
        "x": 351.2428283691406,
        "score": 0.8471063375473022,
        "name": "left_eye"
    },
    {
        "y": 123.61557006835939,
        "x": 304.60729598999023,
        "score": 0.8702555894851685,
        "name": "right_eye"
    },
    {
        "y": 151.78714752197268,
        "x": 371.62044525146484,
        "score": 0.864836573600769,
        "name": "left_ear"
    },
    {
        "y": 152.0789527893066,
        "x": 270.35282135009766,
        "score": 0.724021315574646,
        "name": "right_ear"
    },
    {
        "y": 262.0664978027344,
        "x": 414.5983123779297,
        "score": 0.7761140465736389,
        "name": "left_shoulder"
    },
    {
        "y": 305.58746337890625,
        "x": 224.6723175048828,
        "score": 0.8686800599098206,
        "name": "right_shoulder"
    },
    {
        "y": 335.27000427246094,
        "x": 564.5779037475586,
        "score": 0.8009536862373352,
        "name": "left_elbow"
    },
    {
        "y": 471.97334289550776,
        "x": 152.41262435913086,
        "score": 0.3059219419956207,
        "name": "right_elbow"
    },
    {
        "y": 131.28780364990237,
        "x": 507.0810317993164,
        "score": 0.8383532762527466,
        "name": "left_wrist"
    },
    {
        "y": 473.4333038330078,
        "x": 152.24822998046875,
        "score": 0.05063867196440697,
        "name": "right_wrist"
    },
    {
        "y": 513.2359313964843,
        "x": 413.1103515625,
        "score": 0.433409720659256,
        "name": "left_hip"
    },
    {
        "y": 526.8021392822266,
        "x": 267.24552154541016,
        "score": 0.5118745565414429,
        "name": "right_hip"
    },
    {
        "y": 457.4954605102539,
        "x": 473.7363052368164,
        "score": 0.23225606977939606,
        "name": "left_knee"
    },
    {
        "y": 476.62540435791016,
        "x": 167.54352569580078,
        "score": 0.02866836078464985,
        "name": "right_knee"
    },
    {
        "y": 459.8150253295898,
        "x": 476.16214752197266,
        "score": 0.026787688955664635,
        "name": "left_ankle"
    },
    {
        "y": 565.1614379882811,
        "x": 353.8031005859375,
        "score": 0.00687823910266161,
        "name": "right_ankle"
    }
]
*/

const HEAD_POINTS = ["nose", "left_eye", "right_eye", "left_ear", "right_ear"];
const REAL_INDEXES = {
  nose: 0,
  left_eye: 1,
  right_eye: 2,
  left_ear: 3,
  right_ear: 4,
  left_shoulder: 6,
  right_shoulder: 5,
  left_elbow: 8,
  right_elbow: 7,
  left_wrist: 10,
  right_wrist: 9,
  left_hip: 12,
  right_hip: 11,
  left_kneee: 14,
  right_knee: 13,
  left_ankle: 16,
  rught_ankle: 15
}

function invertColors(data) {
  for (var i = 0; i < data.length; i+= 4) {
    data[i] = data[i] ^ 255 //+400; 
    data[i+1] = data[i+1] ^ 255 //-790; 
    data[i+2] = data[i+2] ^ 255 //-4; 
  }
}

function mirrorKeypoints(data) {
  if (data.length > 0) {
    data[0].keypoints.forEach(data => {
      data.x = Math.abs(data.x - 640)
      if (data.name != "nose") {
        if (/right.+/.test(data.name)) {
          data.name = data.name.replace("right", "left")
        } else {
          data.name = data.name.replace("left", "right")
        }
      }
    })
  }
}

function getColor(pointA, pointB) {
  const OFFSET = 50
  
  if (pointA.x + OFFSET > pointB.x && pointA.x - OFFSET < pointB.x && pointA.y + OFFSET > pointB.y && pointA.y - OFFSET < pointB.y) {
    return true
  }
  return false
}

function App() {
  const [isLoggedIn, setLoggedIn] = useState(true);
  const [firstTry, setFirstTry] = useState(true);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/inicio" element={isLoggedIn && <Tracking /> || <ReturnToLogin/>} />
        <Route path="/" element={<LoginPage setLoggedIn = {setLoggedIn} firstTry = {firstTry} setFirstTry = {setFirstTry}/>} />
      </Routes>
    </BrowserRouter>
  );
}

function ReturnToLogin() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate("/")
  })

  return (
    <></>
  )
}

function Tracking() {
  const [count, setCount] = useState(0)
  const webcamRef = useRef(null)
  const imageRef = useRef(null)
  const videoRef = useRef(null)
  const currentFramePose = useRef(null)
  const canvasRef = useRef(null)
  const detectorRef = useRef(null)
  const increment = useRef(1);
  let actualValue = 2;
  
  function drawSkeleton(keypoints, poseId) {
    poseDetection.util.getAdjacentPairs("MoveNet").forEach(([i, j]) => {
      const kp1 = keypoints[i];
      const kp2 = keypoints[j];
  
      const score1 = kp1.score != null ? kp1.score : 1;
      const score2 = kp2.score != null ? kp2.score : 1;
      const scoreThreshold = 0.3 || 0;

      if (score1 >= scoreThreshold && score2 >= scoreThreshold) {
        if ((kp1.name == "left_shoulder" || kp1.name == "right_shoulder") && (kp2.name == "left_elbow" || kp2.name == "right_elbow")) { 
          canvasRef.current.getContext("2d").lineWidth = actualValue;
        } else {
          canvasRef.current.getContext("2d").lineWidth = 2;
        }
        try {
          if (getColor(kp1, currentFramePose.current[0].keypoints[REAL_INDEXES[kp1.name]]) && getColor(kp2, currentFramePose.current[0].keypoints[REAL_INDEXES[kp2.name]])) {
            canvasRef.current.getContext("2d").fillStyle = "green";
            canvasRef.current.getContext("2d").strokeStyle = "green";
          } else {
            canvasRef.current.getContext("2d").fillStyle = "blue";
            canvasRef.current.getContext("2d").strokeStyle = "blue";
          }
        } catch {
          canvasRef.current.getContext("2d").fillStyle = "blue";
          canvasRef.current.getContext("2d").strokeStyle = "blue";
        }

        canvasRef.current.getContext("2d").beginPath();
        canvasRef.current.getContext("2d").moveTo(kp1.x, kp1.y);
        canvasRef.current.getContext("2d").lineTo(kp2.x, kp2.y);
        canvasRef.current.getContext("2d").stroke();
      }
    });
  }

  function handleContraction(event) {
    const contraction = new TextDecoder("utf-8").decode(event.target.value);
    actualValue = contraction;
    console.log('Contraction level is ' + contraction);
  }

  async function getPoses() {
    if (webcamRef && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
      const ctx = canvasRef.current.getContext("2d", {willReadFrequently: true});
      
      if (increment.current === 1) {
        ctx.translate(canvasRef.current.width, 0);
        ctx.scale(-1, 1);
        increment.current = 2;
      }
      const poses = await detectorRef.current.estimatePoses(webcamRef.current.video)
      ctx.drawImage(imageRef.current, 0, 0, 640, 480)
      const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)
      invertColors(imageData.data)
      ctx.putImageData(imageData, 0, 0)

      if (!currentFramePose.current) {
        const image = new Image()
        image.src = canvasRef.current.toDataURL()
        imageRef.current.width = 640
        imageRef.current.height = 480
        currentFramePose.current = await detectorRef.current.estimatePoses(imageRef.current)
        console.log(currentFramePose.current)
        //mirrorKeypoints(currentFramePose.current)
      }
      if (currentFramePose.current.length > 0) {
        ctx.fillStyle = "black"
        currentFramePose.current[0].keypoints.forEach((keypoint) => {
          if (keypoint.score > 0.3) {
            ctx.beginPath();
            ctx.arc(keypoint.x, keypoint.y, 2, 0, 2*Math.PI);
            ctx.fill();
          }
        }) 
      }
      if (poses.length > 0) {
        ctx.fillStyle = "black"
        drawSkeleton(poses[0].keypoints, poses[0].id)
      }
      requestAnimationFrame(getPoses)
    } else {
      requestAnimationFrame(getPoses)
    }
  }

  useEffect(() => {
    async function createDetector() {
      await tf.ready();
      const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER})
      detectorRef.current = detector
      getPoses();
    }
    canvasRef.current.width = 640;
    canvasRef.current.height = 480;
    createDetector()
  }, [])
  
  return (
    <>
      <h1>JustTry</h1>
      <p>Por favor active Experimental Web Platform Features, aquí: <a href="chrome://flags/#enable-experimental-web-platform-features">chrome://flags/#enable-experimental-web-platform-features</a></p>
      <strong style={{marginBottom: "10px"}}>Copie y pegue el link en su buscador de Google Chrome</strong>
      <Webcam mirrored style={{
        //position: 'absolute',
        marginLeft: 'auto',
        marginRight: 'auto',
        left: 0,
        right: 0,
        textAlign: 'center',
        zIndex: 9,
        width: "0%",
        height: "0%",
      }} ref={webcamRef}/>

      <img ref={imageRef} hidden src="../Foto.jpg"/>

      <canvas style={{
        //position: 'absolute',
        marginLeft: 'auto',
        marginBottom: "10px",
        marginRight: 'auto',
        left: 0,
        right: 0,
        textAlign: 'center',
        zIndex: 9,
      }} ref={canvasRef}/>

      <button style={{backgroundColor: "#0c151c"}} onClick={() => {
          navigator.bluetooth.requestDevice({
            filters: [{
              name: "JustTry"
            }],
            optionalServices: ["91bad492-b950-4226-aa2b-4ede9fa42f59", "cba1d466-344c-4be3-ab3f-189f80dd7518"]
          }).then((device) => {
            console.log(device)
            return device.gatt.connect()
          }).then(server => {
            console.log(server.getPrimaryService("91bad492-b950-4226-aa2b-4ede9fa42f59"))
            return server.getPrimaryService("91bad492-b950-4226-aa2b-4ede9fa42f59")
          }).then(service => {
            console.log(service.getCharacteristic("cba1d466-344c-4be3-ab3f-189f80dd7518"))
            return service.getCharacteristic("cba1d466-344c-4be3-ab3f-189f80dd7518")
          }).then(characteristic => {
            return characteristic.startNotifications()
          }).then(characteristic => {
            characteristic.addEventListener('characteristicvaluechanged', handleContraction);
            return characteristic.readValue();
          }).catch((error) => {
            console.log(error)
          })
          setCount((count) => count + 1)
        }}>
          Bluetooth {count}
        </button>
        {/*<video src="../WIN_20231115_14_25_17_Pro.mp4" controls ref={videoRef} style={{
          width: "640px",
          height: "480px"
        }}></video>*/}
    </>
  )
}

function LoginPage(props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (event) => {
    event.preventDefault()
    navigate("/inicio")
    return
    const { user, password } = Object.fromEntries(new window.FormData(event.target))
    fetch("http://localhost:5000/get_data").then(data => {
      return data.json()
    }).then(data =>{
      const filteredData = data.filter(elem => elem.email == user)
      if (filteredData.length > 0 && filteredData[0].name == password) {
        props.setLoggedIn(true);
        navigate("/inicio")
      }
      if (props.firstTry) props.setFirstTry(false)
    })
  };

  return (
    <div>
      <h2>Iniciar Sesión</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          name="user"
          placeholder="Nombre de usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          name="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button style={{backgroundColor: "#0c151c"}} type='submit'>Iniciar Sesión</button> 
      </form>
      {!props.firstTry && <p style={{color: "red", position: "absolute", top: "68%", margin: "0 auto"}}>Nombre de usuario o contraseña incorrectos</p>}
    </div>
  );
}

export default App