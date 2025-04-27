"use strict";

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat,log]
    this.duration = duration; //in km
    this.distance = distance; //in min
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    //descrption defined here
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  //not used anywhere
  click() {
    this.clicks++;
  }
}
class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    //have the acess to the parent class
    //will get type defined here
    //we never create workout object
    //descrption called
    this._setDescription();
  }
  calcPace() {
    //min per km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cyclilng extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    //have the acess to the parent class
    this._setDescription();
  }
  calcSpeed() {
    //km/hr
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}
// const run1 = new Running([38, -17], 5.4, 32, 178);
// const cycling1 = new Cyclilng([38, -17], 25, 84, 455);
// console.log(run1, cycling1);

/////////////////////////////////
//architecture

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
const deleteWorkout = document.querySelector(".delete-workout");

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;

  constructor() {
    //when we create new object out of this class
    //contructor is called first

    //get user position
    this._getPosition();

    this._getLocalStorage();
    //this in the addEventListener will always point towards
    //dom element of the event it is attached to
    form.addEventListener("submit", this._netWorkout.bind(this));

    inputType.addEventListener("change", this._toggleElevationField);
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
    deleteWorkout.addEventListener("click", this.reset);
  }
  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("could not get your position");
        }
      );
  }
  _loadMap(position) {
    console.log(position);
    const { latitude, longitude } = position.coords;
    console.log(latitude, longitude);
    const coords = [latitude, longitude];
    console.log(`https://www.google.pt/maps/@${latitude},${longitude}`);
    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    //handle click on map
    //this is app object
    this.#map.on("click", this._showForm.bind(this));
    //can be called here only after map is being loaded
    //here workout contains the data from the loacl storage
    this.#workouts.forEach((work) => this._renderWorkoutMarker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }
  _hideForm() {
    // clear input feilds
    inputCadence.value = "";
    inputDistance.value = "";
    inputElevation.value = "";
    inputDuration.value = "";
    //hide the form and
    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }
  _netWorkout(event) {
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);
    const { lat, lng } = this.#mapEvent.latlng;
    // console.log(mapEvent);

    //get data from form
    event.preventDefault();
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;

    //check if data is valid
    if (type == "running") {
      const cadence = +inputCadence.value;
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert("Input have to be positive number");
      workout = new Running([lat, lng], distance, duration, cadence);
      // this.#workouts.push(workout);
    }
    if (type == "cycling") {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert("Input have to be positive number");
      workout = new Cyclilng([lat, lng], distance, duration, elevation);
      // this.#workouts.push(workout);
    }
    this.#workouts.push(workout);
    console.log(workout);
    //render workout on the map as marker
    this._renderWorkoutMarker(workout);
    //render list of the all workouts
    this._renderWorkout(workout);
    //hide form after entering all values
    this._hideForm();
    this._setLocalStorage();
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 350,
          minWidth: 50,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;
    if (workout.type === "running")
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
    if (workout.type === "cycling")
      html += `
         <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;
    form.insertAdjacentHTML("afterend", html);
  }
  _moveToPopup(e) {
    const workOutEl = e.target.closest(".workout");
    console.log(workOutEl);
    if (!workOutEl) return;
    const workout = this.#workouts.find(
      (work) => work.id === workOutEl.dataset.id
    );
    console.log(workout);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    // workout.click();
  }
  //using the public interface
  _setLocalStorage() {
    localStorage.setItem("workout", JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workout"));
    console.log(data);

    if (!data) return;
    //setting the data when the application loads
    //for the first time #workouts will be empty when application loads
    this.#workouts = data;
    this.#workouts.forEach((work) => {
      //this is just an html
      this._renderWorkout(work);
      //here we cannot call _renderWorkoutMarker cause
      // here map is not loaded yet
      //it's aynch
    });
  }

  // to reset go to console and
  //enter app.reset()
  reset() {
    const workoutData = localStorage.getItem("workout");

    if (!workoutData) {
      alert("No workout data found");
      return;
    }
    localStorage.removeItem("workout");
    location.reload();
  }
}

const app = new App();
