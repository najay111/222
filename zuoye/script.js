// 设置 Mapbox 访问令牌
mapboxgl.accessToken = "pk.eyJ1IjoibmFqYXkxIiwiYSI6ImNtNXdqYzQxZjBjbjEyanF6ZXh2aDRqOGcifQ.DO5Klv9yr6ayI_cAoGk6eA";

// 初始化 Mapbox 地图
const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/dark-v10",  // 默认深色底图
    center: [-98.35, 39.5], // 美国中心
    zoom: 5
});

// **底图数组**
const basemaps = [
    "mapbox://styles/mapbox/light-v10",  
    "mapbox://styles/mapbox/dark-v10",   
    "mapbox://styles/mapbox/satellite-v9"
];
let currentBasemapIndex = 1; // 默认深色底图

// 添加地图导航控件
map.addControl(new mapboxgl.NavigationControl(), "top-right");
map.addControl(new mapboxgl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true,
    showUserHeading: true
}), "top-right");

// 数据源信息
const tilesetId = "mapbox://najay1.d182sure";
const sourceLayer = "Americaair_polution-6obltc";

// **默认污染物类型**
let selectedPollutant = "Days PM2_5";
let filterYear = ["==", ["get", "Year"], 2020];
let filterPollutant = ["has", selectedPollutant];

map.on("load", () => {
    console.log("✅ 地图加载完成!");

    map.addSource("air_quality", {
        type: "vector",
        url: tilesetId
    });

    map.addLayer({
        id: "air_quality",
        type: "circle",
        source: "air_quality",
        "source-layer": sourceLayer,
        paint: {
            "circle-radius": getRadiusScale(selectedPollutant),
            "circle-color": getColorScale(selectedPollutant),
            "circle-opacity": 0.8
        }
    });

    console.log("✅ 污染数据已添加!");
    setupHoverEffect();
    setupPopup();
    addLegend();
    setupBasemapSwitch();

    document.querySelectorAll(".pollutant-button").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".pollutant-button").forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");
            setPollutionType(button.id);
        });
    });
});

// **更新时间**
function updateTime() {
    let year = document.getElementById("timeSlider").value;
    document.getElementById("yearLabel").innerText = year;
    filterYear = ["==", ["get", "Year"], parseInt(year)];

    if (map.getLayer("air_quality")) {
        map.setFilter("air_quality", ["all", filterYear, filterPollutant]);
        console.log("✅ 过滤器更新:", filterYear);
    } else {
        console.warn("⚠️ 图层未找到，无法更新数据");
    }
}

// **污染物类型切换**
function setPollutionType(type) {
    console.log("📌 选择的污染物类型:", type);

    if (type === "no2") {
        selectedPollutant = "Max AQI";
    } else if (type === "pm25") {
        selectedPollutant = "Days PM2_5";
    } else if (type === "o3") {
        selectedPollutant = "Days Ozone";
    } else {
        selectedPollutant = "Max AQI";
    }

    filterPollutant = ["has", selectedPollutant];

    if (map.getLayer("air_quality")) {
        map.setPaintProperty("air_quality", "circle-color", getColorScale(selectedPollutant));
        map.setPaintProperty("air_quality", "circle-radius", getRadiusScale(selectedPollutant));
        map.setFilter("air_quality", ["all", filterYear, filterPollutant]);
        console.log("✅ 过滤器 & 颜色 & 大小更新:", filterYear, filterPollutant);
    } else {
        console.warn("⚠️ 图层未找到，无法更新数据");
    }
}

// **颜色映射**
function getColorScale(pollutant) {
    return [
        "interpolate",
        ["linear"],
        ["to-number", ["coalesce", ["get", pollutant], 0]],
        0, "#00FF00",  
        100, "#FFFF00",
        200, "#FF7F00",
        300, "#FF0000"
    ];
}

// **大小映射**
function getRadiusScale(pollutant) {
    if (pollutant === "Days Ozone") {
        return [
            "interpolate",
            ["linear"],
            ["to-number", ["coalesce", ["get", pollutant], 1]],
            0, 4,  
            100, 7,
            200, 10,
            366, 13
        ];
    } else {
        return [
            "interpolate",
            ["linear"],
            ["to-number", ["coalesce", ["get", pollutant], 1]],
            0, 3,   
            50, 5,
            100, 7,
            200, 10
        ];
    }
}

// **鼠标悬停高亮**
function setupHoverEffect() {
    map.on("mousemove", "air_quality", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["air_quality"] });

        if (features.length) {
            map.setPaintProperty("air_quality", "circle-stroke-width", 2);
            map.setPaintProperty("air_quality", "circle-stroke-color", "#000000");
        } else {
            map.setPaintProperty("air_quality", "circle-stroke-width", 0);
        }
    });
}

// **弹出信息框**
function setupPopup() {
    const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });

    map.on("mouseenter", "air_quality", (e) => {
        const properties = e.features[0].properties;
        const description = `
            <strong>Location: ${properties.County}, ${properties.State}</strong><br>
            ${selectedPollutant}: ${properties[selectedPollutant]}
        `;

        popup.setLngLat(e.lngLat).setHTML(description).addTo(map);
    });

    map.on("mouseleave", "air_quality", () => popup.remove());
}

// **添加图例**
// ✅ **添加彩色图例**
function addLegend() {
    const legend = document.getElementById("legend") || document.createElement("div");
    legend.id = "legend";
    legend.innerHTML = `
        <div><strong>Pollution Level</strong></div>
        <div><span style="background:#00FF00"></span> Low</div>
        <div><span style="background:#FFFF00"></span> Moderate</div>
        <div><span style="background:#FF7F00"></span> High</div>
        <div><span style="background:#FF0000"></span> Severe</div>
    `;

    // ✅ **设置样式**
    legend.style.position = "absolute";
    legend.style.bottom = "10px";
    legend.style.left = "10px";  // **左下角**
    legend.style.background = "rgba(255,255,255,0.9)";
    legend.style.padding = "10px";
    legend.style.borderRadius = "8px";
    legend.style.fontSize = "12px";
    legend.style.boxShadow = "0px 0px 10px rgba(0,0,0,0.1)";

    // ✅ **确保 `span` 颜色显示正确**
    legend.querySelectorAll("span").forEach(span => {
        span.style.display = "inline-block";
        span.style.width = "12px";
        span.style.height = "12px";
        span.style.marginRight = "5px";
        span.style.borderRadius = "50%"; // 使其变成圆点
    });

    // **添加到页面**
    if (!document.getElementById("legend")) {
        document.body.appendChild(legend);
    }
}


// **底图切换**
// **底图切换**
function setupBasemapSwitch() {
    document.getElementById("switchBasemap").addEventListener("click", () => {
        currentBasemapIndex = (currentBasemapIndex + 1) % basemaps.length;
        map.setStyle(basemaps[currentBasemapIndex]); // 切换底图
        console.log("🗺️ 切换底图:", basemaps[currentBasemapIndex]);

        // 等待新底图加载完成后，重新添加数据层和交互功能
        map.once("style.load", () => {
            console.log("🎯 底图加载完成，重新添加污染数据层");

            // 重新添加数据源
            if (!map.getSource("air_quality")) {
                map.addSource("air_quality", {
                    type: "vector",
                    url: tilesetId
                });
            }

            // 重新添加污染物数据层
            map.addLayer({
                id: "air_quality",
                type: "circle",
                source: "air_quality",
                "source-layer": sourceLayer,
                paint: {
                    "circle-radius": getRadiusScale(selectedPollutant),
                    "circle-color": getColorScale(selectedPollutant),
                    "circle-opacity": 0.8
                }
            });

            // 重新添加鼠标悬停事件
            setupHoverEffect();
        });
    });
}

// ✅ **鼠标悬停高亮效果**
function setupHoverEffect() {
    const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });

    map.on("mousemove", "air_quality", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["air_quality"] });

        if (features.length) {
            const feature = features[0];
            map.setPaintProperty("air_quality", "circle-stroke-width", [
                "case",
                ["==", ["id"], feature.id],
                2,  // 悬停的点边框加粗
                0.5  // 其他点正常
            ]);

            map.setPaintProperty("air_quality", "circle-stroke-color", "#000000"); // 黑色边框
            map.setPaintProperty("air_quality", "circle-opacity", [
                "case",
                ["==", ["id"], feature.id],
                1,  // 悬停时更清晰
                0.6  // 其他点变淡
            ]);

            // 显示悬停数据
            const properties = feature.properties;
            const description = `<strong>Location: ${properties.County}, ${properties.State}</strong><br>${selectedPollutant}: ${properties[selectedPollutant]}`;
            popup.setLngLat(e.lngLat).setHTML(description).addTo(map);
        } else {
            map.setPaintProperty("air_quality", "circle-stroke-width", 0.5);
            map.setPaintProperty("air_quality", "circle-opacity", 0.8);
            popup.remove();
        }
    });

    map.on("mouseleave", "air_quality", () => {
        popup.remove();
    });
}


// **重新添加数据源和图层**
function addDataLayer() {
    if (!map.getSource("air_quality")) {
        map.addSource("air_quality", {
            type: "vector",
            url: tilesetId
        });
    }

    if (!map.getLayer("air_quality")) {
        map.addLayer({
            id: "air_quality",
            type: "circle",
            source: "air_quality",
            "source-layer": sourceLayer,
            paint: {
                "circle-radius": getRadiusScale(selectedPollutant),
                "circle-color": getColorScale(selectedPollutant),
                "circle-opacity": 0.8
            }
        });

        console.log("✅ 重新加载污染数据");
    }
}