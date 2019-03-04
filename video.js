/**
 * Copyright 2018 Bart Butenaers
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {
    var settings = RED.settings;

    function HTML(config) { 
        // The configuration is a Javascript object, which needs to be converted to a JSON string
        var configAsJson = JSON.stringify(config);
        
        // TODO add config.id to the canvas id ..
        var html = String.raw`
        <canvas id="cameraCanvas" style="width:100%; height:100%" ng-init='init(` + configAsJson + `)'></canvas>
        `;
        
        return html;
    };

    function checkConfig(node, conf) {
        if (!conf || !conf.hasOwnProperty("group")) {
            node.error(RED._("ui_my-little-ui-node.error.no-group"));
            return false;
        }
        return true;
    }

    var ui = undefined;
    
    function UiVideoNode(config) {
         try {
            var node = this;
            if(ui === undefined) {
                ui = RED.require("node-red-dashboard")(RED);
            }
            RED.nodes.createNode(this, config);

        if (checkConfig(node, config)) { 
            var html = HTML(config);
            var done = ui.addWidget({
                node: node,
                group: config.group,
                width: config.width,
                height: config.height,
                format: html,
                templateScope: "local",
                emitOnlyNewValues: false,
                forwardInputMessages: false,
                storeFrontEndInputAsState: false,
                convertBack: function (value) {
                    return value;
                },
                beforeEmit: function(msg, value) {
                    return { msg: msg };
                },
                beforeSend: function (msg, orig) {
                    if (orig) {
                        return orig.msg;
                    }
                },
                initController: function($scope, events) {
                    $scope.flag = true;
			
                    $scope.init = function (config) {
                        $scope.config = config;
                        
                        $scope.shapes = new Map();
                        $scope.clickables = new Map();
                        
                        
                        $scope.canvas = document.getElementById('cameraCanvas')
                        $scope.ctx = $scope.canvas.getContext('2d');
                        
                        //$scope.lastCalledTime = Date.now();
                        //$scope.imageCount = 1;
                        $scope.executionTimes = [];
                        
                        // TODO maak image smoothing adjustable via checkbox op het config screen
                        // Zie https://devlog.disco.zone/2016/07/22/canvas-scaling/ voor extra info !!!!
                        //$scope.ctx.mozImageSmoothingEnabled = true;  // firefox
                        //$scope.ctx.imageSmoothingEnabled = true;        

                        if (config.source === "fetch") {
                            // Let a 'video' element decode the video, but we won't show the 'video' via the DOM tree to the user.
                            // Instead we will draw all decoded images into a canvas, which is shown via the DOM tree to the user.
                            // This allows us to draw all kind of stuff on top of the video.
                            // See https://stackoverflow.com/questions/4429440/html5-display-video-inside-canvas/38711016
                            var video = document.createElement('video');
                            video.src = config.url; // TODO show 'no url' if no url ...
                            video.controls = false;
                            video.autoPlay = false;
                            video.loop = false;
                            video.muted = true;
                            
                            video.onerror = function(e){
                                // TODO
                            }
                            
                            video.oncanplay = function(event){ // this is a referance to the video
                                // the video may not match the canvas size so find a scale to fit
                                $scope.videoContainer.scale = Math.min($scope.canvas.width / this.videoWidth, $scope.canvas.height / this.videoHeight); 
                                $scope.videoContainer.ready = true;
                                // the video can be played so let the browser execute our callback funciton code on the next available screen repaint.
                                // By calling requestAnimationFrame() repeatedly to create an animation, we are assured that our animation code is called 
                                // when the user's computer is actually ready to make changes to the screen each time, resulting in a smooth animation.
                                requestAnimationFrame(updateCanvas);
                                // add instruction
                                //document.getElementById("playPause").textContent = "Click video to play/pause.";
                                //document.querySelector(".mute").textContent = "Mute";
                            }

                            $scope.videoContainer = {  // we will add properties as needed
                                 video : video,
                                 ready : false,   
                            };
                            
                            // TODO autoplay ???
                            $scope.videoContainer.video.play();
                        }
                        
                        $scope.canvas.addEventListener('click', (e) => {
                            for (var shape of $scope.shapes.values()) {
                                switch (shape.type) {
                                    case "polygon":
                                        var inside = false;
                                        var mouseX;
                                        var mouseY;
                                        
                                        if (e.offsetX) {
                                            mouseX = e.offsetX;
                                            mouseY = e.offsetY;
                                        }
                                        else if (e.layerX) {
                                            mouseX = e.layerX;
                                            mouseY = e.layerY;
                                        }
                           
                                        /*var inverseTransform = $scope.ctx.getTransform().invertSelf();
                                        
                                        mouseX = mouseX * inverseTransform.a + mouseY * inverseTransform.c + inverseTransform.e;
                                        mouseY = mouseX * inverseTransform.b + mouseY * inverseTransform.d + inverseTransform.f;
                                                                         
                                        // Check whether the point is inside the polygon
                                        // Ray-casting algorithm based on 
                                        // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
                                        for (var i = 0, j = shape.points.length - 1; i < shape.points.length; j = i++) {
                                            var xi = shape.points[i].x;
                                            var yi = shape.points[i].y;
                                            var xj = shape.points[j].x;
                                            var yj = shape.points[j].y;
                                            var intersect = ((yi > mouseY) != (yj > mouseY)) && (mouseX < (xj - xi) * (mouseY - yi) / (yj - yi) + xi);
                                            if (intersect) {
                                                inside = !inside;
                                            }
                                        }*/
                                        
                                        // Misschien beter ispointinpath gebruiken
                                        // Zie https://www.ibm.com/developerworks/library/wa-games/index.html

                                        if (inside) {
                                            alert("inside polygon x = " + mouseX + " and y = " + mouseY);
                                        }
                                        else {
                                            alert("NOT inside polygon x = " + mouseX + " and y = " + mouseY);
                                        }
                                    
                                        break;
                                        
                                        debugger;
                                }
                            }
                        });
                        
                        // TODO deze oproepen als er iets wijzigt, en alles van de scaling hier in zetten (en $scope.transform updaten en die in updateCanvas gebruiken. 
                        function calculateTransformation() {
                            
                        }
                        
                        function getAreaDetails(area, imageWidth, imageHeight) {
                            var details = {};
                            
                            // TODO instelbaar maken via de user interface
                            const horizontalMargin = 5; //px
                            const verticalMargin = 5; //px
                            
                            // The layout is separated into 9 areas:
                            //      area11  area12  area13
                            //      area21  area22  area23
                            //      area31  area32  area33
                            
                            switch (area) {
                                case "area11":
                                    details.horizontal = "left";
                                    details.vertical = "top";
                                    details.x = horizontalMargin;
                                    details.y = verticalMargin;
                                    details.top = 0;
                                    details.bottom = imageHeight / 3;
                                    details.left = 0;
                                    details.right = imageWidth / 3;
                                    break;
                                case "area12":
                                    details.horizontal = "center";
                                    details.vertical = "top";
                                    details.x = imageWidth / 2;
                                    details.y = verticalMargin;
                                    details.top = 0;
                                    details.bottom = imageHeight / 3;
                                    details.left = imageWidth / 3;
                                    details.right = imageWidth * 2 / 3;
                                    break;
                                case "area13":
                                    details.horizontal = "right";
                                    details.vertical = "top";
                                    details.x = imageWidth - horizontalMargin;
                                    details.y = verticalMargin;
                                    details.top = 0;
                                    details.bottom = imageHeight / 3;
                                    details.left = imageWidth * 2 / 3;
                                    details.right = imageWidth;
                                    break;
                                case "area21":
                                    details.horizontal = "left";
                                    details.vertical = "middle";
                                    details.x = horizontalMargin;
                                    details.y = imageHeight / 2;
                                    details.top = imageHeight / 3;
                                    details.bottom = imageHeight * 2 / 3;
                                    details.left = 0;
                                    details.right = imageWidth / 3;
                                    break;
                                case "area22":
                                    details.horizontal = "center";
                                    details.vertical = "middle";
                                    details.x = imageWidth / 2;
                                    details.y = imageHeight / 2;
                                    details.top = imageHeight / 3;
                                    details.bottom = imageHeight * 2 / 3;
                                    details.left = imageWidth / 3;
                                    details.right = imageWidth * 2 / 3;
                                    break;
                                case "area23":
                                    details.horizontal = "right";
                                    details.vertical = "middle";
                                    details.x = imageWidth - horizontalMargin;
                                    details.y = imageHeight / 2;
                                    details.top = imageHeight / 3;
                                    details.bottom = imageHeight * 2 / 3;
                                    details.left = imageWidth * 2 / 3;
                                    details.right = imageWidth;
                                    break;
                                case "area31":
                                    details.horizontal = "left";
                                    details.vertical = "bottom";
                                    details.x = horizontalMargin;
                                    details.y = imageHeight - verticalMargin;
                                    details.top = imageHeight * 2 / 3;
                                    details.bottom = imageHeight;
                                    details.left = 0;
                                    details.right = imageWidth / 3;
                                    break;
                                case "area32":
                                    details.horizontal = "center";
                                    details.vertical = "bottom";
                                    details.x = imageWidth / 2;
                                    details.y = imageHeight - verticalMargin;
                                    details.top = imageHeight * 2 / 3;
                                    details.bottom = imageHeight;
                                    details.left = imageWidth / 3;
                                    details.right = imageWidth * 2 / 3;
                                    break;
                                case "area33":
                                    details.horizontal = "right";
                                    details.vertical = "bottom";
                                    details.x = imageWidth - horizontalMargin;
                                    details.y = imageHeight - verticalMargin;
                                    details.top = imageHeight * 2 / 3;
                                    details.bottom = imageHeight;
                                    details.left = imageWidth * 2 / 3;
                                    details.right = imageWidth;
                                    break;
                            }
                            
                            return details;
                        }

                        function updateCanvas(){
                            // Calculate the fps (frames per second)
                            // See https://www.growingwiththeweb.com/2017/12/fast-simple-js-fps-counter.html
                            const now = Date.now();
                            while ($scope.executionTimes.length > 0 && $scope.executionTimes[0] <= now - 1000) {
                              $scope.executionTimes.shift();
                            }
                            $scope.executionTimes.push(now);
                            var fps = $scope.executionTimes.length;
                                
                            //TODO???? $scope.ctx.save();

                            // Clear the canvas entirely by filling it with black.
                            // That will be the color around the image, when the image doesn't fit into the available space.
                            $scope.ctx.beginPath();
                            $scope.ctx.rect(0, 0, $scope.canvas.width, $scope.canvas.height);
                            $scope.ctx.fillStyle = "black";
                            $scope.ctx.fill();
                                         
                            //TODO??? $scope.ctx.restore();
                            
                            var image;
                            
                            // only draw if loaded and ready
                            if($scope.videoContainer !== undefined && $scope.videoContainer.ready){ // TODO op 'fetch' testen ???
                                // The decoded video image should be resized to fit the canvas.
                                // See https://sdqali.in/blog/2013/10/03/fitting-an-image-in-to-a-canvas-object/
                                image = $scope.videoContainer.video;
                            }
                            else {
                                // Try to get the image from the specified image field
                                try {
                                    RED.util.setMessageProperty($scope.msg, $scope.config.imageField, image, true);
                                } 
                                catch(err) {
                                    node.error("Error getting image from msg." + $scope.config.imageField + " : " + err.message);
                                }
                            
                                if (!image || !Buffer.isBuffer(image)) {
                                    // TODO wat dan doen?
                                }
                            }
                            
                            // TODO wat als image = null??  Dan moet eigenlijk bovenstaane execution time berekening ook niet gebueren.  
                            
                            var imageWidth = $scope.videoContainer.video.videoWidth;
                            var imageHeight = $scope.videoContainer.video.videoHeight;
                                
                            // TODO De resizing moet instelbaar worden (horizontal, vertical, full).
                                
                            var canvasWidth = $scope.canvas.width;
                            var canvasHeight = $scope.canvas.height;
                            var imageAspectRatio = imageWidth / imageHeight;
                            var canvasAspectRatio = canvasWidth / canvasHeight;
                            var renderableHeight, renderableWidth, xStart, yStart;

                            // If image's aspect ratio is less than canvas's we fit on height
                            // and place the image centrally along width
                            if(imageAspectRatio < canvasAspectRatio) {
                                renderableHeight = canvasHeight;
                                renderableWidth = imageWidth * (renderableHeight / imageHeight);
                                xStart = (canvasWidth - renderableWidth) / 2;
                                yStart = 0;
                            }

                            // If image's aspect ratio is greater than canvas's we fit on width
                            // and place the image centrally along height
                            else if(imageAspectRatio > canvasAspectRatio) {
                                renderableWidth = canvasWidth;
                                renderableHeight = imageHeight * (renderableWidth / imageWidth);
                                xStart = 0;
                                yStart = (canvasHeight - renderableHeight) / 2;
                            }

                            // Happy path - keep aspect ratio
                            else {
                                renderableHeight = canvasHeight;
                                renderableWidth = canvasWidth;
                                xStart = 0;
                                yStart = 0;
                            }
                            
                            $scope.transformation = { horScale: renderableWidth / imageWidth, horSkew: 0, verSkew: 0, verScale: renderableHeight / imageHeight, horMove:xStart, verMove:yStart };
                            
                            $scope.ctx.setTransform($scope.transformation.horScale,
                                                    $scope.transformation.horSkew,
                                                    $scope.transformation.verSkew,
                                                    $scope.transformation.verScale,
                                                    $scope.transformation.horMove,
                                                    $scope.transformation.verMove);
                                                    
                            
                            // Draw the decoded video image in the canvas, with the calculated scaling
                            //$scope.ctx.drawImage($scope.videoContainer.video, xStart, yStart, renderableWidth, renderableHeight);
                            $scope.ctx.drawImage($scope.videoContainer.video, 0, 0, imageWidth, imageHeight);
     
                            /*if($scope.videoContainer.video.paused){ 
                                // if not playing show the paused screen, i.e. draw pay icon
                                 $scope.ctx.fillStyle = "black";  // darken display
                                 $scope.ctx.globalAlpha = 0.5;
                                 $scope.ctx.fillRect(0,0,$scope.canvas.width,$scope.canvas.height);
                                 $scope.ctx.fillStyle = "#DDD"; // colour of play icon
                                 $scope.ctx.globalAlpha = 0.75; // partly transparent
                                 $scope.ctx.beginPath(); // create the path for the icon
                                 var size = ($scope.canvas.height / 2) * 0.5;  // the size of the icon
                                 $scope.ctx.moveTo($scope.canvas.width/2 + size/2, $scope.canvas.height / 2); // start at the pointy end
                                 $scope.ctx.lineTo($scope.canvas.width/2 - size/2, $scope.canvas.height / 2 + size);
                                 $scope.ctx.lineTo($scope.canvas.width/2 - size/2, $scope.canvas.height / 2 - size);
                                 $scope.ctx.closePath();
                                 $scope.ctx.fill();
                                 $scope.ctx.globalAlpha = 1; // restore alpha
                            }*/
                            
                            // Draw all the specified shapes on top of the decoded video images
                            for (var shape of $scope.shapes.values()) {
                                switch (shape.type) {
                                    case "polygon":                                       
                                        $scope.ctx.beginPath();
                                        $scope.ctx.moveTo(shape.points[0].x, shape.points[0].y);
                                        for (var j = 1; j < shape.points.length; j++) {
                                            $scope.ctx.lineTo(shape.points[j].x, shape.points[j].y);
                                        }     
                                        $scope.ctx.closePath();
                                        $scope.ctx.fill();    
                                        break;
                                }
                            }
                            
                            // Apply the font setting from the config screen
                            var font = $scope.config.font || "Arial";
                            var fontSize = $scope.config.fontSize || 12;
                            $scope.ctx.strokeStyle='black';
                            $scope.ctx.font = "bold " + fontSize + "px " + font; 
                            $scope.ctx.lineWidth = 3;
                            $scope.ctx.fillStyle="white";
                            
                            // Draw the content of the 9 areas, when specified.
                            // For texts: show a small black stroke around the white filled letters, to make sure 
                            // it is always visible on top of any background color.
                            for (var row = 1; row <= 3; row++) {
                                for (var column = 1; column <= 3; column++) {
                                    var areaName = "area" + row + column;
                                    var areaContent = $scope.config[areaName];
                                    
                                    var details = getAreaDetails(areaName, imageWidth, imageHeight)
                                    
                                    switch (areaContent) {
                                        case "fps":
                                            $scope.ctx.textAlign = details.horizontal;
                                            $scope.ctx.textBaseline = details.vertical;
                                            $scope.ctx.strokeText(fps + " fps", details.x, details.y );
                                            $scope.ctx.fillText(fps + " fps", details.x, details.y );
                                            break;
                                        case "res":
                                            // Show the resolution
                                            $scope.ctx.textAlign = details.horizontal;
                                            $scope.ctx.textBaseline = details.vertical;
                                            $scope.ctx.strokeText(imageWidth + "x" + imageHeight, details.x, details.y );
                                            $scope.ctx.fillText(imageWidth + "x" + imageHeight, details.x, details.y );
                                            break;
                                        case "pt":
                                            // Show the pan/tilt buttons

                                            
                                            // TODO top en bottom gebruiken uit de details
                                            var x = (details.right - details.left) / 2 + details.left;
                                            var y = (details.bottom - details.top) / 2 + details.top;

                                            // Show a large semi-transparent circle behind the buttons
                                            $scope.ctx.globalAlpha = 0.5;
                                            $scope.ctx.beginPath();
                                            $scope.ctx.arc(x, y, 45, 0, Math.PI * 2, true);
                                            $scope.ctx.fillStyle = "grey";
                                            $scope.ctx.fill();
                                            
                                            // Show a 'home' button
                                            $scope.ctx.globalAlpha = 0.7;
                                            $scope.ctx.beginPath();
                                            $scope.ctx.arc(x, y, 15, 0, Math.PI * 2, true);
                                            $scope.ctx.fillStyle = "grey";
                                            $scope.ctx.fill();
                                            //TODO$scope.clickables.set("home_position", TODO het path registreren);
                                            
                                            // The buttons should have a white shadow, to make sure they are visible on light backgrounds
                                            $scope.ctx.globalAlpha = 1.0;
                                            $scope.ctx.strokeStyle = "black";
                                            $scope.ctx.shadowColor = "white";
                                            $scope.ctx.shadowBlur = 2;
                                            
                                            // Show an 'up' button
                                            $scope.ctx.beginPath();
                                            $scope.ctx.moveTo(x-5, y - 30);
                                            $scope.ctx.lineTo(x, y - 35);
                                            $scope.ctx.lineTo(x+5, y - 30);
                                            $scope.ctx.stroke();

                                            // Show a 'down' button
                                            $scope.ctx.beginPath();
                                            $scope.ctx.moveTo(x-5, y + 30);
                                            $scope.ctx.lineTo(x, y + 35);
                                            $scope.ctx.lineTo(x+5, y + 30);
                                            $scope.ctx.stroke();
                                            
                                            // Show a 'left' button
                                            $scope.ctx.beginPath();
                                            $scope.ctx.moveTo(x-30, y-5);
                                            $scope.ctx.lineTo(x-35, y);
                                            $scope.ctx.lineTo(x-30, y+5);
                                            $scope.ctx.stroke();
                                                                                        
                                            // Show a 'right' button
                                            $scope.ctx.beginPath();
                                            $scope.ctx.moveTo(x+30, y-5);
                                            $scope.ctx.lineTo(x+35, y);
                                            $scope.ctx.lineTo(x+30, y+5);
                                            $scope.ctx.stroke();
                                            
                                            $scope.ctx.shadowBlur = 0;

                                            break;
                                        case "zoom":
                                            // Show the zoom in/out buttons
                                            break;
                                        case "stat":
                                            // TODO
                                            break;
                                        case "name":
                                            // TODO
                                            break;
                                    }
                                }
                            }
                            
                            if ($scope.config.source === "fetch") {
                                // We should only fetch the next image, as soon as the browser is ready to do that.
                                // This is not required when the images are pushed (via websocket), since then the 
                                // Node-RED flow determines when the next image arrives.
                                requestAnimationFrame(updateCanvas);
                            }
                        }
                    };

                    $scope.$watch('msg', function(msg) {
                        const svgns = "http://www.w3.org/2000/svg";
                        
                        if (!msg) {
                            // Ignore undefined msg
                            return;
                        }
                        
                        // When the images are being pushed, let's get the image from the message
                        if ($scope.config.source === "push") {
                            updateCanvas();
                        }

                        if (msg.payload && Array.isArray(msg.payload)) {
                            for (var i = 0; i < msg.payload.length; i++) {
                                var shape = msg.payload[i];
                                
                                var name = shape.name;
                                
                                switch (shape.action) {
                                    case "draw":
                                        var shapeConfig = {};

                                        switch (shape.type) {
                                            case "zone":
                                                shapeConfig.type = "polygon";
                                                shapeConfig.showPoints = shape.showPoints;
                                                shapeConfig.fillPattern = shape.fillPattern;
                                                shapeConfig.clickable = shape.clickable;
                                                shapeConfig.points = shape.points;
                                                break;
                                            default:
                                                // TODO fout loggen onbekende shape
                                        }

                                        $scope.shapes.set(name, shapeConfig);
                                        break;
                                    case "delete":
                                        $scope.shapes.delete(name);
                                        break;
                                    default:
                                        // TODO fout loggen onbekende action
                                }
                            }
                            
                            /*
                            for (var i = 0; i < msg.payload.length; i++) {
                                var element = null;
                                var action = msg.payload[i];
                                if (action.name) {
                                    // If the element exist already, we will delete it first
                                    element = document.getElementById(action.name);
                                }
                                
                                var svgElement = document.getElementById("camera-" + $scope.config.id);
                                switch (action.action) {
                                    case "draw":
                                        //var strokeColor =
                                        switch (action.type) {
                                            case "polygon":
                                                var points = "";
                                            
                                                var showPoints = action.showPoints;
                                                var fillPattern = action.fillPattern;
                                                
                                                var clickable = action.clickable;
                                                
                                                for (var j = 0; j < action.points.length; j++) {
                                                    points += action.points[j].x;
                                                    points += ",";
                                                    points += action.points[j].y;
                                                    points += " ";
                                                }
                                                
                                                points = points.trim();
                                                
                                                var polygon = document.createElementNS(svgns, "polygon");
                                                polygon.setAttributeNS(null, "points", points);
                                                polygon.setAttributeNS(null, "fill", action.fillColor);
                                                polygon.setAttributeNS(null, "stroke", action.color);
                                                svgElement.appendChild(polygon);
                                                // De showpoints moet markers tekenen
                                                // https://vanseodesign.com/web-design/svg-markers/
                                                // TODO polygon tekenen
                                                break;
                                            case "object":
                                                // TODO error if not available
                                                var points = action.points;
                                                var strokeColor = action.strokeColor; // TODO other name ???
                                                var fillColor = action.fillColor;
                                                var showPoints = action.showPoints; 
                                                var fillPattern = action.fillPattern;
                                                // Voor pattern zie https://css-tricks.com/simple-patterns-for-separation/
                                                // http://iros.github.io/patternfills/sample_svg.html
                                                // https://github.com/iros/patternfills (npm install -g patternfills)
                                                // https://stackoverflow.com/questions/13378797/how-to-dynamically-change-the-image-pattern-in-svg-using-javascript
                                                //TODO rectangle tekenen
                                        }
                                        break;
                                    case "delete":
                                        if (action.name) {
                                            // TODO enkel in de children van de SVG zoeken ...
                                            var elem = document.getElementById(action.name);
                                            elem.parentNode.removeChild(elem);
                                        }
                                        break;
                                }
                            }*/
                        }
                    });
                }
            });
        }
        }
        catch (e) {
            console.log(e);
        }
		
        node.on("close", function() {
            if (done) {
                done();
            }
        });
    }

    RED.nodes.registerType("ui-video", UiVideoNode);
}
