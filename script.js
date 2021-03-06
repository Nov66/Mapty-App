'use strict';
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  // NOTE: Select workouts using ID
  id = (Date.now() + '').slice(-10);
  // id = String(new Date()).slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    /* HIGHLIGHT: Used in Child Class because child class contains 'type' wen need for this calculation
    - this constructor method will get access to all the methods of the parent class
    - can MOT call it on the Workout class because it does not has 'type'
    */
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / this.duration / 60;
    return this.speed;
  }
}
// const run = new Running([-37, 144], 5.2, 24, 178);
// const cycle = new Cycling([-37, 144], 5.2, 24, 178);
// console.log(run, cycle);

// HIGHLIGHT: Application Architecture
class App {
  #map;
  #mapZoomLevel = 14;
  #mapEvent;
  #workout = [];

  constructor() {
    // NOTE: Get User's position
    this._getPosition();

    // NOTE: Get Data from LocalStorage
    this._getLocalStorage();

    // NOTE: Attach event handler
    form.addEventListener('submit', this._newWorkout.bind(this));
    // HIGHLIGHT: Toggle Cadence and Elevation
    inputType.addEventListener('change', this._toggleElevationField);
    /* NOTE: Event Delegation -> add event listener to the Parent Element
    - Move to Marker on Click
    */
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  /* HIGHLIGHT: Get Current GeoLocation
  - First Callback function -> Get position successfully
  - Second Callback function -> Error if no location got
  */
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }

  _loadMap(position) {
    // console.log(position);
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(latitude, longitude);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    // console.log(map);

    /*L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    */

    // NOTE: Use Google Maps
    L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(this.#map);

    /*NOTE: on is coming from Leaflet
  - HIGHLIGHT: Handle Clicks on Map
  */
    this.#map.on('click', this._showForm.bind(this));

    /* NOTE: Call this method here because map has not loaded when getting localStorage
     */
    this.#workout.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    // console.log(this.#mapEvent);
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // NOTE: Empty Inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    // NOTE: Helper function
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // NOTE: Get Data from Form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // NOTE: If workout is Running, create Running Object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // HIGHLIGHT: Check if data is valid
      if (
        /* !Number.isFinite(distance) ||
          !Number.isFinite(duration) ||
          !Number.isFinite(cadence)
        */
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Running([lat, lng], distance, duration, cadence);
      console.log(workout);
    }

    // NOTE: If workout is Cycling, create Cycling Object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // NOTE: Add new object to Workout Array
    this.#workout.push(workout);
    console.log(workout);

    // NOTE: Render Workout on map as marker

    // HIGHLIGHT: Display Marker
    this._renderWorkoutMarker(workout);

    // NOTE: Render Workout on List
    this._renderWorkout(workout);

    // NOTE: Hide form + clear input fields
    // HIGHLIGHT: Clear Input Fields
    this._hideForm();

    // NOTE: Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '?????????????' : '?????????????'}  ${workout.description}`
      )
      .openPopup()
      ._icon.classList.add('huechange');
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '?????????????' : '?????????????'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">???</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
      `;
    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">??????</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">????????</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
    `;
    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">??????</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">???</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    console.log(workoutEl);

    if (!workoutEl) return;

    // console.log(this.#workout[0].id);

    const workout = this.#workout.find(
      work => work.id === workoutEl.dataset.id
    );
    console.log(workout);

    /* NOTE: Use setView() method to move to the coordinate location
    - First argument is Coordinates
    - Second argument is Zoom Level
    */
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  /* NOTE: LocalStorage -> Only use for small amounts of data -> because it is Blocking
    - First, Give it a name -> 'workouts'
    - Second argument need to be a String that we want to store, and associated with key('workouts')
    - localStorage -> is a simple key value store -> we need a KEY and Simple Value
    - Can convert Object to String -> JSON.stringify()
    - getItem -> convert String back to Object -> JSON.parse()
    */
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workout));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);

    // NOTE: Check if there is any data in the LocalStorage
    if (!data) return;

    this.#workout = data;
    this.#workout.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
const app = new App();
