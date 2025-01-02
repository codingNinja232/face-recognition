import React, { useEffect,  useState } from 'react';
import * as faceapi from 'face-api.js';
import './FaceRecognition.css';

const FaceRecognition = ({ videoRef, handleVideoOnPlay, detections }) => {
  const [capturedImages, setCapturedImages] = useState([]);
  const [capturedFaceData, setCapturedFaceData] = useState([]);

  useEffect(() => {
    const startVideo = () => {
      navigator.mediaDevices
        .getUserMedia({ video: {} })
        .then((stream) => {
          videoRef.current.srcObject = stream;
        })
        .catch((err) => console.error(err));
    };

    startVideo();
  }, [videoRef]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.addEventListener('play', () => {
        const canvas = faceapi.createCanvasFromMedia(videoRef.current);
        const displaySize = {
          width: videoRef.current.width,
          height: videoRef.current.height,
        };
        faceapi.matchDimensions(canvas, displaySize);

        const drawDetections = () => {
          const context = canvas.getContext('2d');
          context.clearRect(0, 0, canvas.width, canvas.height);
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
          faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
        };

        if (detections.length > 0) {
          drawDetections();
        }
      });
    }
  }, [detections, videoRef]);

  const saveFaceData = async () => {
    //const canvas = document.createElement('canvas');
    //const img = await canvas.loadImage(dataUrl);
    //const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
    const descriptor = await detections.descriptor;
    console.log(descriptor);

  }

  let jsonDescriptor = {};

  const captureImage = () => {
    const video = videoRef.current;

    if (video) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Draw detections and expressions on the canvas
      if (detections.length > 0) {
        const resizedDetections = faceapi.resizeResults(detections, {
          width: canvas.width,
          height: canvas.height,
        });
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        const descriptors = resizedDetections.map(face => face.descriptor);
        console.log(detections);
        
        jsonDescriptor = JSON.stringify(Array.from(descriptors));
        setCapturedFaceData(jsonDescriptor);
        
        console.log(descriptors);
        //faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
        //saveFaceData();
        
      }

      const dataUrl = canvas.toDataURL('image/jpeg');
      
      setCapturedImages([dataUrl]);  
      
      //console.log(dataUrl);
      //const myFace = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
      //const descriptor = myFace.descriptor;
      //console.log(faceapi.detectSingleFace(dataUrl).withFaceLandmarks().withFaceDescriptor());
    }
  };

  return (
    <div className="face-recognition-container">
      <video
        ref={videoRef}
        autoPlay
        muted
        onPlay={handleVideoOnPlay}
        width="720"
        height="560"
        className="video-stream"
      />
      <button onClick={captureImage} className="capture-button">
        Capture Image
      </button>

      <div className="captured-images-container">
        {capturedImages.map((image, index) => (
          <img
            key={index}
            src={image}
            alt={`Captured ${index}`}
            className="captured-image"
          />
        ))}
      </div>
      
      
    </div>
  );
};

export default FaceRecognition;
