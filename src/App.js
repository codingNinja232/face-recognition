import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import "./App.css";

const FaceDetectionApp = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [faces, setFaces] = useState([]); // Store the labeled faces
  const [newFaces, setNewFaces] = useState([]);
  const [message, setMessage] = useState("");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const CONFIDENCE_THRESHOLD = 0.9;
  const SIMILARITY_THRESHOLD = 0.25;

  // Function to load static images and extract face descriptors
  const loadStaticImages = async () => {
    const imageUrls = [
      "https://raw.githubusercontent.com/codingNinja232/express-quiz-app/main/public/images/Sheetal1.jpg",
      "https://raw.githubusercontent.com/codingNinja232/express-quiz-app/main/public/images/Sheetal2.jpg",
      "https://raw.githubusercontent.com/codingNinja232/express-quiz-app/main/public/images/Piyush1.jpg",
      "https://raw.githubusercontent.com/codingNinja232/express-quiz-app/main/public/images/Piyush2.jpg",
      "https://raw.githubusercontent.com/codingNinja232/express-quiz-app/main/public/images/Piyush3.jpg",
      "https://raw.githubusercontent.com/codingNinja232/express-quiz-app/main/public/images/Dhruv1.jpg",
      "https://raw.githubusercontent.com/codingNinja232/express-quiz-app/main/public/images/Dhruv2.jpg",
      "https://raw.githubusercontent.com/codingNinja232/express-quiz-app/main/public/images/Aanandi1.jpg",
      "https://raw.githubusercontent.com/codingNinja232/express-quiz-app/main/public/images/Aanandi2.jpg",
      "https://raw.githubusercontent.com/codingNinja232/express-quiz-app/main/public/images/Aanandi3.jpg",
    ];

    const loadedFaces = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Allow cross-origin requests
    img.src = imageUrls[i]; // Now pointing to the Express server on port 5000
    let lableName = img.src.substring(img.src.lastIndexOf('/') + 1);
    lableName = lableName.substring(0, lableName.indexOf('.')-1);
    //console.log(lableName);

    img.onload = async () => {
      const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
      if (detections) {
        loadedFaces.push({
          label: lableName,
          descriptor: detections.descriptor,
        });
      }
      };
    }

    // Wait for images to be loaded
  setTimeout(() => {
    setFaces(loadedFaces);
  }, 2000); // Adjust the timeout to ensure images are loaded before setting faces
  };

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = process.env.PUBLIC_URL + "/models";
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      
      setModelsLoaded(true);  // Set modelsLoaded to true once models are loaded
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
    startVideo();
  }, []);

  const detectFaces = async () => {
    if (!modelsLoaded) return;  // Don't start detection until models are loaded

    if (videoRef.current && canvasRef.current) {
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: CONFIDENCE_THRESHOLD }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      const displaySize = {
        width: videoRef.current.offsetWidth,
        height: videoRef.current.offsetHeight,
      };

      faceapi.matchDimensions(canvasRef.current, displaySize);
      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      const context = canvasRef.current.getContext("2d");
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      faceapi.draw.drawDetections(canvasRef.current, resizedDetections);

      resizedDetections.forEach((detection) => {
        const faceDescriptor = detection.descriptor;
        const confidence = detection.detection.score;

        if (confidence < CONFIDENCE_THRESHOLD) return;

        const match = faces.find(
          (face) => faceapi.euclideanDistance(face.descriptor, faceDescriptor) < SIMILARITY_THRESHOLD
        );

        if (match) {
          showTemporaryMessage(`Detected face \"${match.label}\".`);
          return;
        }

        let isDuplicate = newFaces.some(
          (face) => faceapi.euclideanDistance(face.descriptor, faceDescriptor) < SIMILARITY_THRESHOLD
        );
        isDuplicate = faces.some(
          (face) => faceapi.euclideanDistance(face.descriptor, faceDescriptor) < SIMILARITY_THRESHOLD
        );

        if (!isDuplicate && newFaces.length < 5) {
          const newFace = {
            descriptor: faceDescriptor,
            thumbnail: createThumbnail(videoRef.current, detection.detection.box),
          };
          setNewFaces((prev) => [...prev, newFace]);
          console.log(newFaces.length);
        }
      });
    }
  };

  const createThumbnail = (video, box) => {
    const canvas = document.createElement("canvas");

    const padding = 150;
    const x = Math.max(box.x - padding, 0);
    const y = Math.max(box.y - padding, 0);
    const width = Math.min(box.width + 2 * padding, video.videoWidth - x);
    const height = Math.min(box.height + 2 * padding, video.videoHeight - y);

    canvas.width = 100;
    canvas.height = 100;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      video,
      x,
      y,
      width,
      height,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas.toDataURL();
  };

  const showTemporaryMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 2000);
  };

  const handleFormSubmit = (e, index) => {
    e.preventDefault();
    const newFace = newFaces[index];

    const label = e.target.elements[`label-${index}`].value;
    setFaces((prevFaces) => [
      ...prevFaces,
      { label, descriptor: newFace.descriptor },
    ]);

    setNewFaces((prev) => prev.filter((_, i) => i !== index));
    showTemporaryMessage(`Face labeled as \"${label}\" and stored.`);
  };

  const handleSkip = (index) => {
    setNewFaces((prev) => prev.filter((_, i) => i !== index)); // Remove the skipped face from the list
  showTemporaryMessage("Face skipped.");
    
  };

  useEffect(() => {
    if (modelsLoaded) {
      loadStaticImages();  // Load the static images after the models are loaded
    }
  }, [modelsLoaded]);

  useEffect(() => {
    if (modelsLoaded) {
      const interval = setInterval(detectFaces, 1000);
      return () => clearInterval(interval);
    }
  }, [modelsLoaded, faces, newFaces]);

  return (
    <div className="app-container">
      <h1>Face Detection App</h1>
      <div className="overlay-container">
        <video ref={videoRef} autoPlay muted width="360" height="360"></video>
        <canvas ref={canvasRef} width="360" height="360"></canvas>
      </div>
      {message && <div className="message">{message}</div>}

      {newFaces.map((newFace, index) => (
        <div className="thumbnail-container" key={index}>
          <img src={newFace.thumbnail} alt="New Face Thumbnail" className="thumbnail" />
          <form onSubmit={(e) => handleFormSubmit(e, index)} className="form">
            <label>
              Label for new face:
              <input type="text" name={`label-${index}`} required />
            </label>
            <button type="submit">Submit</button>
            <button type="button" onClick={() => handleSkip(index)}>Skip</button>
          </form>
        </div>
      ))}
    </div>
  );
};

export default FaceDetectionApp;
