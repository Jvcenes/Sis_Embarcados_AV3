const FIREBASE_URL = 'https://sistema-iot-23388-default-rtdb.firebaseio.com/.json';
let allData = {};
let currentDay = null;
let tempChart = null;
let humidityChart = null;

async function fetchData() {
    try {
        const response = await fetch(FIREBASE_URL);
        if (!response.ok) throw new Error('Erro ao carregar dados');
        const data = await response.json();
        return data.sensores || {};
    } catch (error) {
        showError('Erro ao conectar com o Firebase: ' + error.message);
        return null;
    }
}

function showError(message) {
    document.getElementById('loading').style.display = 'none';
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function processData(sensors) {
    const dayData = {};
    
    Object.values(sensors).forEach(reading => {
        const date = reading.timestamp.split('_')[0];
        if (!dayData[date]) {
            dayData[date] = [];
        }
        dayData[date].push(reading);
    });

    Object.keys(dayData).forEach(day => {
        dayData[day].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    });

    return dayData;
}

function calculateStats(dayData) {
    let hottestDay = { temp: -Infinity, date: '', avg: 0 };
    let coldestDay = { temp: Infinity, date: '', avg: 0 };
    let mostHumid = { humidity: -Infinity, date: '', avg: 0 };
    let leastHumid = { humidity: Infinity, date: '', avg: 0 };

    let totalTemp = 0;
    let totalHumidity = 0;
    let totalReadings = 0;

    Object.entries(dayData).forEach(([date, readings]) => {
        const avgTemp = readings.reduce((s, r) => s + r.temperatura, 0) / readings.length;
        const avgHumidity = readings.reduce((s, r) => s + r.umidade, 0) / readings.length;

        const maxTemp = Math.max(...readings.map(r => r.temperatura));
        const minTemp = Math.min(...readings.map(r => r.temperatura));

        const maxHumidity = Math.max(...readings.map(r => r.umidade));
        const minHumidity = Math.min(...readings.map(r => r.umidade));

        readings.forEach(r => {
            totalTemp += r.temperatura;
            totalHumidity += r.umidade;
            totalReadings++;
        });

        if (avgTemp > hottestDay.temp) hottestDay = { temp: maxTemp, date, avg: avgTemp };
        if (avgTemp < coldestDay.temp) coldestDay = { temp: minTemp, date, avg: avgTemp };

        if (avgHumidity > mostHumid.humidity) mostHumid = { humidity: maxHumidity, date, avg: avgHumidity };
        if (avgHumidity < leastHumid.humidity) leastHumid = { humidity: minHumidity, date, avg: avgHumidity };
    });

    const avgTempGlobal = totalTemp / totalReadings;
    const avgHumidityGlobal = totalHumidity / totalReadings;

    return {
        hottestDay, coldestDay, mostHumid, leastHumid, avgTempGlobal, avgHumidityGlobal
    };
}


function displayStats(stats) {
    document.getElementById('hotDay').textContent = `${stats.hottestDay.temp.toFixed(1)}°C`;
    document.getElementById('hotDate').textContent = formatDate(stats.hottestDay.date);
    
    document.getElementById('coldDay').textContent = `${stats.coldestDay.temp.toFixed(1)}°C`;
    document.getElementById('coldDate').textContent = formatDate(stats.coldestDay.date);

    document.getElementById('avgTemp').textContent = `${stats.avgTempGlobal.toFixed(1)}°C`;

    document.getElementById('humidDay').textContent = `${stats.mostHumid.humidity.toFixed(0)}%`;
    document.getElementById('humidDate').textContent = formatDate(stats.mostHumid.date);
    
    document.getElementById('dryDay').textContent = `${stats.leastHumid.humidity.toFixed(0)}%`;
    document.getElementById('dryDate').textContent = formatDate(stats.leastHumid.date);

    document.getElementById('avgHumidity').textContent = `${stats.avgHumidityGlobal.toFixed(0)}%`;
}


function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function createDaySelector(days) {
    const selector = document.getElementById('daySelector');
    selector.innerHTML = '';
    
    days.forEach((day, index) => {
        const btn = document.createElement('button');
        btn.className = 'day-btn';
        btn.textContent = formatDate(day);
        btn.onclick = () => selectDay(day);
        if (index === days.length - 1) {
            btn.classList.add('active');
        }
        selector.appendChild(btn);
    });
}

function selectDay(day) {
    currentDay = day;
    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === formatDate(day));
    });
    updateCharts(day);
}

function updateCharts(day) {
    const readings = allData[day];
    const labels = readings.map(r => r.timestamp.split('_')[1].substring(0, 5));
    const temps = readings.map(r => r.temperatura);
    const humidity = readings.map(r => r.umidade);

    if (tempChart) tempChart.destroy();
    if (humidityChart) humidityChart.destroy();

    const ctx1 = document.getElementById('tempChart').getContext('2d');
    tempChart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperatura (°C)',
                data: temps,
                borderColor: '#ff6b6b',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: getChartOptions('°C')
    });

    const ctx2 = document.getElementById('humidityChart').getContext('2d');
    humidityChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Umidade (%)',
                data: humidity,
                borderColor: '#45b7d1',
                backgroundColor: 'rgba(69, 183, 209, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: getChartOptions('%')
    });
}

function getChartOptions(unit) {
    return {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                labels: {
                    color: '#e0e0e0',
                    font: { size: 14 }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: '#999'
                }
            },
            y: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: '#999',
                    callback: function(value) {
                        return value + unit;
                    }
                }
            }
        }
    };
}

async function init() {
    const sensors = await fetchData();
    if (!sensors) return;

    allData = processData(sensors);
    const days = Object.keys(allData).sort();
    
    if (days.length === 0) {
        showError('Nenhum dado disponível');
        return;
    }

    const stats = calculateStats(allData);
    displayStats(stats);
    createDaySelector(days);
    selectDay(days[days.length - 1]);

    document.getElementById('loading').style.display = 'none';
    document.getElementById('statsSection').style.display = 'block';
    document.getElementById('chartsSection').style.display = 'block';
}

init();