const loadingOverlay = document.getElementById('loading-overlay');
const imageUploadSection = document.querySelector('.image-upload-section');
const webcamSection = document.querySelector('.webcam-section');
const clearDetectionsButton = document.getElementById('clear-detections-button');
const deleteImageButton = document.getElementById('delete-image-button');
const imageFileInput = document.getElementById('image-file-input');
const toggleWebcamButton = document.getElementById('toggle-webcam-button');
const webcamStreamElement = document.getElementById('webcam-stream');
const webcamLiveView = document.querySelector('.webcam-section');

let detectionModel;
let webcamStream;
let isWebcamActive = false;
let webcamOverlays = [];

function initialize() {
    showLoadingOverlay();
    loadDetectionModel();
    setupEventListeners();
}

function showLoadingOverlay() {
    loadingOverlay.style.display = 'flex';
}

function hideLoadingOverlay() {
    loadingOverlay.style.display = 'none';
}

function loadDetectionModel() {
    cocoSsd.load().then((loadedModel) => {
        detectionModel = loadedModel;
        hideLoadingOverlay();
    });
}

function setupEventListeners() {
    imageFileInput.addEventListener('change', handleImageUpload);
    clearDetectionsButton.addEventListener('click', clearDetections);
    deleteImageButton.addEventListener('click', deleteUploadedImage);
    toggleWebcamButton.addEventListener('click', toggleWebcam);
}

function handleImageUpload(event) {
    const uploadedFile = event.target.files[0];
    if (uploadedFile) {
        prepareImageUpload();
        displayUploadedImage(uploadedFile);
    }
}

function prepareImageUpload() {
    deleteImageButton.style.display = 'inline-block';
    clearDetectionsButton.style.display = 'none';
    clearExistingImageAndDetections();
}

function displayUploadedImage(file) {
    const fileReader = new FileReader();
    fileReader.onload = (e) => {
        const uploadedImage = createImageElement(e.target.result);
        imageUploadSection.appendChild(uploadedImage);
    };
    fileReader.readAsDataURL(file);
}

function createImageElement(src) {
    const uploadedImage = document.createElement('img');
    uploadedImage.src = src;
    uploadedImage.alt = 'Uploaded Image';
    uploadedImage.classList.add('uploaded-image');
    uploadedImage.addEventListener('click', handleImageClick);
    return uploadedImage;
}

function handleImageClick(event) {
    const uploadedImage = event.target;
    uploadedImage.style.cursor = 'default';
    clearExistingDetections();
    detectObjectsInImage(uploadedImage);
}

function detectObjectsInImage(image) {
    const imageRect = image.getBoundingClientRect();
    detectionModel.detect(image).then((predictions) => {
        displayPredictions(predictions, imageRect, image.parentNode);
        if (predictions.length > 0) {
            clearDetectionsButton.style.display = 'inline-block';
        }
    });
}

function displayPredictions(predictions, imageRect, parentNode) {
    predictions.forEach((prediction) => {
        const boundingBox = createBoundingBox(prediction, imageRect);
        const predictionText = createPredictionText(prediction, imageRect);
        parentNode.appendChild(boundingBox);
        parentNode.appendChild(predictionText);
    });
}

function createBoundingBox(prediction, videoRect) {
    const boundingBox = document.createElement('div');
    const left = Math.max(videoRect.left + prediction.bbox[0], videoRect.left);
    const top = Math.max(videoRect.top + prediction.bbox[1], videoRect.top);
    const width = Math.min(prediction.bbox[2], videoRect.width - (left - videoRect.left));
    const height = Math.min(prediction.bbox[3], videoRect.height - (top - videoRect.top));
    boundingBox.classList.add('bounding-box');
    boundingBox.style = `
        position: absolute;
        left: ${left}px;
        top: ${top}px;
        width: ${width}px;
        height: ${height}px;
        border: 2px solid #00ff00;
        background-color: rgba(0, 255, 0, 0.2);
        z-index: 1;
    `;
    return boundingBox;
}

function createPredictionText(prediction, videoRect) {
    const predictionText = document.createElement('p');
    const left = Math.max(videoRect.left + prediction.bbox[0], videoRect.left);
    const top = Math.max(videoRect.top + prediction.bbox[1] - 12, videoRect.top);
    predictionText.innerText = `${prediction.class} (${Math.round(prediction.score * 100)}%)`;
    predictionText.style = `
        position: absolute;
        left: ${left}px;
        top: ${top}px;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 4px;
        border-radius: 4px;
        z-index: 2;
        max-width: ${videoRect.width}px;
        overflow: hidden;
        text-overflow: ellipsis;
    `;
    return predictionText;
}

function clearDetections() {
    clearExistingDetections();
    clearDetectionsButton.style.display = 'none';
    const uploadedImage = imageUploadSection.querySelector('.uploaded-image');
    if (uploadedImage) {
        uploadedImage.style.cursor = 'pointer';
    }
}

function clearExistingDetections() {
    const boundingBoxes = imageUploadSection.querySelectorAll('.bounding-box');
    const predictionTexts = imageUploadSection.querySelectorAll('p');
    boundingBoxes.forEach((box) => box.remove());
    predictionTexts.forEach((text) => text.remove());
}

function deleteUploadedImage() {
    clearExistingImageAndDetections();
    deleteImageButton.style.display = 'none';
    clearDetectionsButton.style.display = 'none';
    imageFileInput.value = '';
}

function clearExistingImageAndDetections() {
    const uploadedImage = imageUploadSection.querySelector('.uploaded-image');
    if (uploadedImage) uploadedImage.remove();
    clearExistingDetections();
}

function toggleWebcam() {
    if (isWebcamActive) {
        stopWebcam();
    } else {
        startWebcam();
    }
}

function startWebcam() {
    const constraints = { video: true };
    navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
            webcamStream = stream;
            webcamStreamElement.srcObject = stream;
            webcamStreamElement.style.display = 'block';
            isWebcamActive = true;
            webcamStreamElement.addEventListener('loadeddata', predictWebcamStream);
            toggleWebcamButton.innerText = 'Stop Webcam';
            toggleWebcamButton.style.backgroundColor = '#ff4d4d';
        })
        .catch((error) => {
            console.error('Error accessing webcam:', error);
            alert('Unable to access webcam. Please check your permissions.');
        });
}

function stopWebcam() {
    if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop());
    }
    webcamStreamElement.style.display = 'none';
    webcamStreamElement.srcObject = null;
    isWebcamActive = false;
    webcamStreamElement.removeEventListener('loadeddata', predictWebcamStream);
    clearWebcamOverlays();
    toggleWebcamButton.innerText = 'Start Webcam';
    toggleWebcamButton.style.backgroundColor = '';
}

function predictWebcamStream() {
    if (!isWebcamActive) return;
    detectionModel.detect(webcamStreamElement).then((predictions) => {
        clearWebcamOverlays();
        displayWebcamPredictions(predictions);
        window.requestAnimationFrame(predictWebcamStream);
    });
}

function displayWebcamPredictions(predictions) {
    const webcamRect = webcamStreamElement.getBoundingClientRect();
    predictions.forEach((prediction) => {
        if (prediction.score > 0.5) {
            const boundingBox = createBoundingBox(prediction, webcamRect);
            const predictionText = createPredictionText(prediction, webcamRect);
            webcamLiveView.appendChild(boundingBox);
            webcamLiveView.appendChild(predictionText);
            webcamOverlays.push(boundingBox, predictionText);
        }
    });
}

function clearWebcamOverlays() {
    webcamOverlays.forEach((overlay) => webcamLiveView.removeChild(overlay));
    webcamOverlays = [];
}

initialize();
