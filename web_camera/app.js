document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    const scannedData = document.getElementById('scannedData');
    const downloadButton = document.getElementById('downloadButton');

    let stream = null;
    let filesData = {};

    const startCamera = async () => {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
        video.play();
        startButton.disabled = true;
        stopButton.disabled = false;
        requestAnimationFrame(tick);
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        video.pause();
        startButton.disabled = false;
        stopButton.disabled = true;
    };

    const tick = () => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
            if (qrCode) {
                processQrData(qrCode.data);
            }
        }
        if (stopButton.disabled === false) {
            requestAnimationFrame(tick);
        }
    };

    const processQrData = qrData => {
        try {
            qrData = fixBase64Padding(qrData);
            const chunkWithHeader = atob(qrData);
            const {chunk, chunkNumber, totalChunks, fileName, fileExt} = removeHeader(chunkWithHeader);
            const fileKey = `${fileName}.${fileExt}`;

            if (!filesData[fileKey]) {
                filesData[fileKey] = {
                    totalChunks: totalChunks,
                    chunks: [],
                    fileName: fileName,
                    fileExt: fileExt
                };
            }

            if (!filesData[fileKey].chunks[chunkNumber]) {
                filesData[fileKey].chunks[chunkNumber] = chunk;
                updateScannedDataList(fileKey, chunkNumber, totalChunks - filesData[fileKey].chunks.filter(c => c).length);

                if (filesData[fileKey].chunks.filter(c => c).length === totalChunks) {
                    assembleFile(fileKey);
                }
            }
        } catch (e) {
            console.error('Ошибка при обработке QR-кода:', e);
        }
    };

    const fixBase64Padding = data => {
        while (data.length % 4 !== 0) {
            data += '=';
        }
        return data;
    };

   const removeHeader = chunkWithHeader => {
    const buffer = new ArrayBuffer(chunkWithHeader.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < chunkWithHeader.length; i++) {
        view[i] = chunkWithHeader.charCodeAt(i);
    }

    const chunkNumber = new DataView(buffer.slice(0, 4)).getUint32(0);
    const totalChunks = new DataView(buffer.slice(4, 8)).getUint32(0);
    const fileNameLength = new DataView(buffer.slice(8, 9)).getUint8(0);
    const fileName = String.fromCharCode.apply(null, new Uint8Array(buffer.slice(9, 9 + fileNameLength))).trim();
    const fileExt = String.fromCharCode.apply(null, new Uint8Array(buffer.slice(9 + fileNameLength, 9 + fileNameLength + 3))).trim();
    const chunk = buffer.slice(9 + fileNameLength + 3);
    return { chunk, chunkNumber, totalChunks, fileName, fileExt };
};

    const updateScannedDataList = (fileKey, chunkNumber, remainingChunks) => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
        listItem.textContent = `Файл "${fileKey}" - Отсканирован чанк №${chunkNumber}. Осталось отсканировать: ${remainingChunks} чанков.`;
        scannedData.appendChild(listItem);
    };

    const assembleFile = fileKey => {
        const {chunks, fileName, fileExt} = filesData[fileKey];
        const blob = new Blob(chunks);
        const url = URL.createObjectURL(blob);
        downloadButton.onclick = () => {
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName}.${fileExt}`;
            a.click();
            URL.revokeObjectURL(url);
        };
        downloadButton.disabled = false;
    };

    startButton.addEventListener('click', startCamera);
    stopButton.addEventListener('click', stopCamera);
});