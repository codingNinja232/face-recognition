import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

const FaceDetectionApp = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [faces, setFaces] = useState([]);
  const [message, setMessage] = useState("");
  const [newFaceLabel, setNewFaceLabel] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [currentDescriptor, setCurrentDescriptor] = useState(null);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = process.env.PUBLIC_URL + '/models';
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      startVideo();
    };

    const startVideo = () => {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => console.error("Error accessing webcam: ", err));
    };

    loadModels();
  }, []);

  const detectFaces = async () => {
    if (videoRef.current && canvasRef.current) {
      const detections = await faceapi
        .detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        )
        .withFaceLandmarks()
        .withFaceDescriptors();

      const displaySize = {
        width: videoRef.current.width,
        height: videoRef.current.height,
      };

      faceapi.matchDimensions(canvasRef.current, displaySize);
      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      canvasRef.current.getContext("2d").clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      faceapi.draw.drawDetections(canvasRef.current, resizedDetections);

      resizedDetections.forEach((detection) => {
        const faceDescriptor = detection.descriptor;
        const match = faces.find((face) => 
          faceapi.euclideanDistance(face.descriptor, faceDescriptor) < 0.75
        );

        if (match) {
          setMessage(`Face for label "${match.label}" is detected.`);
          setShowForm(false);
        } else {
          setCurrentDescriptor(faceDescriptor);
          setShowForm(true);
        }
      });
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (newFaceLabel && currentDescriptor) {
      setFaces((prevFaces) => [...prevFaces, { label: newFaceLabel, descriptor: currentDescriptor }]);
      setNewFaceLabel("");
      setCurrentDescriptor(null);
      setShowForm(false);
      setMessage("New face added successfully.");
    }
  };

  useEffect(() => {
    const interval = setInterval(detectFaces, 1000); // Run detection every 1 second
    return () => clearInterval(interval);
  }, [faces]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
      }}
    >
      <h1>Face Detection App</h1>
      <video
        ref={videoRef}
        autoPlay
        muted
        width="360"
        height="360"
        style={{ border: "1px solid black" }}
      ></video>
      <canvas ref={canvasRef} width="360" height="360" style={{ position: "absolute" }}></canvas>

      {message && <div style={{ marginTop: "20px", color: "green" }}>{message}</div>}

      {showForm && (
        <form onSubmit={handleFormSubmit} style={{ marginTop: "20px" }}>
          <label>
            Label for new face: 
            <input
              type="text"
              value={newFaceLabel}
              onChange={(e) => setNewFaceLabel(e.target.value)}
              required
            />
          </label>
          <button type="submit">Submit</button>
        </form>
      )}
    </div>
  );
};

export default FaceDetectionApp;
