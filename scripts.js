const map = L.map('map').setView([0, 0], 3);
let firebaseCode = '';
let markers = [];
let leafletMarkers = {};

const imageUrl = 'atlas.png';
const imageBounds = [[-90, -180], [90, 180]];

L.imageOverlay(imageUrl, imageBounds).addTo(map);

const customIcon = L.icon({
    iconUrl: 'hater.png',
    iconSize: [16, 16],
    iconAnchor: [8, 16]
});

window.onload = () => {
    const savedCode = localStorage.getItem('firebaseCode');
    if (savedCode) {
        document.getElementById('firebaseCode').value = savedCode;
        firebaseCode = savedCode;
        loadMarkersFromFirebase(savedCode);
    }
    map.setView(new L.LatLng(-28.27470756925772, -27.010640094552915), 6);

    const newIcon = L.icon({
        iconUrl: 'start.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
    });
    const newMarker = L.marker([-28.27470756925772, -27.010640094552915], { icon: newIcon }).addTo(map);
    newMarker.bindPopup("Новая метка");
};


document.getElementById('authButton').addEventListener('click', () => {
    firebaseCode = document.getElementById('firebaseCode').value.trim();
    if (firebaseCode) {
        localStorage.setItem('firebaseCode', firebaseCode);
        loadMarkersFromFirebase(firebaseCode);
    } else {
        alert('Введите код доступа!');
    }
});

function loadMarkersFromFirebase(code) {
    const url = `https://interactive-event-${code}-default-rtdb.europe-west1.firebasedatabase.app/markers.json`;
    // const url = `https://interactive-test-${code}-default-rtdb.europe-west1.firebasedatabase.app/markers.json`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            markers = data ? Object.values(data) : [];
            updateMarkerList();
            addMarkersToMap();
            enableControls();
        })
        .catch(error => {
            console.error('Ошибка загрузки меток:', error);
            alert('Ошибка при загрузке меток. Проверьте код доступа.');
        });
}

async function saveMarkersToFirebase() {
    if (!firebaseCode) {
        alert('Сначала авторизуйтесь!');
        return;
    }

    const url = `https://interactive-event-${firebaseCode}-default-rtdb.europe-west1.firebasedatabase.app/markers.json`;

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(markers)
        });

        if (response.ok) {
            console.log('Метки успешно сохранены.');
        } else {
            throw new Error('Ошибка при сохранении меток.');
        }

    } catch (error) {
        console.error('Ошибка сохранения меток:', error);
        alert('Ошибка при сохранении меток.');
    }
}

function addMarkersToMap() {
    markers.forEach(marker => {
        const leafletMarker = L.marker(marker.latlng, { icon: customIcon }).addTo(map);
        leafletMarker.bindPopup(marker.name);
        leafletMarkers[marker.name] = leafletMarker;
    });
}

function updateMarkerList() {
    const list = document.getElementById('markerList');
    list.innerHTML = '';
    markers.forEach(marker => {
        const item = document.createElement('div');
        item.className = 'marker-item';
        item.textContent = marker.name;

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Удалить';
        removeBtn.className = 'remove-btn';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            deleteMarker(marker);
        };

        item.appendChild(removeBtn);
        item.onclick = () => {
            map.setView(marker.latlng, 7);
            highlightMarker(marker.name);
        };
        list.appendChild(item);
    });
}

function deleteMarker(marker) {
    if (confirm(`Вы уверены, что хотите удалить метку "${marker.name}"?`)) {
        markers = markers.filter(m => m.name !== marker.name);
        if (leafletMarkers[marker.name]) {
            map.removeLayer(leafletMarkers[marker.name]);
            delete leafletMarkers[marker.name];
        }
        saveMarkersToFirebase();
        updateMarkerList();
    }
}


map.on('click', async (e) => {
    if (!firebaseCode) {
        alert('Сначала авторизуйтесь!');
        return;
    }

    const markerName = prompt('Введите название метки (только цифры):');
    if (!/^\d+$/.test(markerName)) {
        alert('Название метки должно состоять только из цифр.');
        return;
    }

    await loadMarkersFromFirebaseAndAddMarker(e.latlng, markerName);
});

async function loadMarkersFromFirebaseAndAddMarker(latlng, markerName) {
    const url = `https://interactive-event-${firebaseCode}-default-rtdb.europe-west1.firebasedatabase.app/markers.json`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        markers = data ? Object.values(data) : [];

        if (markers.some(marker => marker.name === markerName)) {
            alert('Метка с таким именем уже существует.');
            return;
        }

        const newMarker = {
            name: markerName,
            latlng: latlng
        };

        markers.push(newMarker);

        const leafletMarker = L.marker(latlng, { icon: customIcon }).addTo(map);
        leafletMarker.bindPopup(markerName);
        leafletMarkers[markerName] = leafletMarker;

        await saveMarkersToFirebase();

        updateMarkerList();

    } catch (error) {
        console.error('Ошибка при загрузке меток:', error);
        alert('Не удалось загрузить метки перед добавлением.');
    }
}

function highlightMarker(name) {
    const items = document.querySelectorAll('.marker-item');
    items.forEach(item => {
        item.classList.remove('active');
        if (item.textContent.includes(name)) {
            item.classList.add('active');
        }
    });
}

document.getElementById('search').addEventListener('input', (e) => {
    const searchValue = e.target.value;
    const filteredMarkers = markers.filter(marker => marker.name.includes(searchValue));
    const list = document.getElementById('markerList');
    list.innerHTML = '';
    filteredMarkers.forEach(marker => {
        const item = document.createElement('div');
        item.className = 'marker-item';
        item.textContent = marker.name;
        item.onclick = () => {
            map.setView(marker.latlng, 7);
            highlightMarker(marker.name);
        };

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Удалить';
        removeBtn.className = 'remove-btn';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            deleteMarker(marker);
        };
        item.appendChild(removeBtn);

        list.appendChild(item);
    });
});

document.getElementById('sortAsc').addEventListener('click', () => {
    markers.sort((a, b) => a.name - b.name);
    updateMarkerList();
});

document.getElementById('sortDesc').addEventListener('click', () => {
    markers.sort((a, b) => b.name - a.name);
    updateMarkerList();
});

function enableControls() {
    document.getElementById('search').disabled = false;
    document.getElementById('sortAsc').disabled = false;
    document.getElementById('sortDesc').disabled = false;
}
