import { useState, useRef, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import * as tf from '@tensorflow/tfjs'
import * as tfjsWebgl from '@tensorflow/tfjs-backend-webgl'
import * as poseDetection from '@tensorflow-models/pose-detection'
import Webcam from 'react-webcam'

function App() {
  const [count, setCount] = useState(0)
  const [noseColor, setNoseColor] = useState(null)
  const webcamRef = useRef(null)
  const canvasRef = useRef(null)
  const detectorRef = useRef(null)
  const increment = useRef(1);
  const noIncrement = useRef(0);
  let color = 0;
  const colors = ["red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white"]
  
  function handleContraction(event) {
    const contraction = new TextDecoder("utf-8").decode(event.target.value);
    color = contraction;
    console.log('Contraction level is ' + contraction);
  }

  async function getPoses() {
    if (webcamRef && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
      const ctx = canvasRef.current.getContext("2d");
      if (increment.current === 1) {
        ctx.translate(canvasRef.current.width, 0);
        ctx.scale(-1, 1);
        increment.current = 0;
      }
      const poses = await detectorRef.current.estimatePoses(webcamRef.current.video)
      ctx.drawImage(webcamRef.current.video, 0, 0, canvasRef.current.width, canvasRef.current.height)
      if (poses.length > 0) {
        poses[0].keypoints.forEach((keypoint) => {
          if (keypoint.name == "nose") {
            console.log(`rgb(${color*255/4095}, 0, 0)`)
            ctx.fillStyle = `rgb(${color*255/4095}, 0, 0)`
          } else {
            ctx.fillStyle = `rgb(${color*125/4095}, ${color*100/4095}, ${color*255/4095})`
          }
          if (keypoint.score > 0.3) ctx.fillRect((300*Math.abs(keypoint.x)/640), (150*keypoint.y/480), 5, 5);
        })
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
      const ctx = canvasRef.current.getContext("2d");
      getPoses();
    }

    createDetector()
  }, [])
  
  return (
    <>
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

      <img hidden src="data:image/jpeg;base64,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"/>

      <canvas style={{
        //position: 'absolute',
        marginLeft: 'auto',
        marginRight: 'auto',
        left: 0,
        right: 0,
        textAlign: 'center',
        zIndex: 9,
        width: 640,
        height: 480
      }} ref={canvasRef}/>

<button onClick={() => {
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
            // Reading Battery Level…
            characteristic.addEventListener('characteristicvaluechanged', handleContraction);
            return characteristic.readValue();
          }).catch((error) => {
            console.log(error)
          })
          setCount((count) => count + 1)
        }}>
          Bluetooth {count}
        </button>
    </>
  )
}

export default App