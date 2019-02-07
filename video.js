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

/**********************************************************************
 *  -> ng-init is required to transfer the node configuration from the Node-RED flow to the dashboard.
 *  -> ng-model is used to make sure the data is (two way) synchronized between the scope and the html element.
 *          (the 'textContent' variable on the AngularJs $scope is called the 'model' of this html element.
 *  -> ng-change is used to do something (e.g. send a message to the Node-RED flow, as soon as the data in the model changes.
 *  -> ng-keydown is used to do something when the user presses a key. (e.g., type a value into a textbox, then press enter)
 **********************************************************************/
     function HTML(config) { 
        // The configuration is a Javascript object, which needs to be converted to a JSON string
        var configAsJson = JSON.stringify(config);

        var html = String.raw`
        <canvas id="cameraCanvas" width="100%" height="100%" ng-init='init(` + configAsJson + `)'></canvas>
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
                        
                        // The configuration contains the default text, which needs to be stored in the scope
                        // (to make sure it will be displayed via the model).
                        $scope.textContent = config.textLabel;
                        
                        $scope.canvas = document.getElementById('cameraCanvas')
                        $scope.ctx = $scope.canvas.getContext('2d');
                        
                        // Let a 'video' element decode the video, but we won't show the 'video' via the DOM tree to the user.
                        // Instead we will draw all decoded images into a canvas, which is shown via the DOM tree to the user.
                        // This allows us to draw all kind of stuff on top of the video.
                        // See https://stackoverflow.com/questions/4429440/html5-display-video-inside-canvas/38711016
                        var video = document.createElement('video');
                        video.src = "http://upload.wikimedia.org/wikipedia/commons/7/79/Big_Buck_Bunny_small.ogv";
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

                        function updateCanvas(){
                            debugger;
                            $scope.ctx.clearRect(0,0,$scope.canvas.width,$scope.canvas.height); 
                            // only draw if loaded and ready
                            if($scope.videoContainer !== undefined && $scope.videoContainer.ready){ 
                            /*
                                // find the top left of the video on the canvas
                                //video.muted = muted;
                                var scale = $scope.videoContainer.scale;
                                var vidH = $scope.videoContainer.video.videoHeight;
                                var vidW = $scope.videoContainer.video.videoWidth;
                                var top = $scope.canvas.height / 2 - (vidH /2 ) * scale;
                                var left = $scope.canvas.width / 2 - (vidW /2 ) * scale;
                                // now just draw the video the correct size
                                $scope.ctx.drawImage($scope.videoContainer.video, left, top, vidW * scale, vidH * scale);
                                */
                                
                                // The decoded video image should be resized to fit the canvas.
                                // See https://sdqali.in/blog/2013/10/03/fitting-an-image-in-to-a-canvas-object/
                                var imageWidth = $scope.videoContainer.video.videoWidth;
                                var imageHeight = $scope.videoContainer.video.videoHeight;
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
                                
                                // Draw the decoded video image in the canvas, with the calculated scaling
                                $scope.ctx.drawImage($scope.videoContainer.video, xStart, yStart, renderableWidth, renderableHeight);
         
                                if($scope.videoContainer.video.paused){ 
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
                                }
                            }
                            
                            // all done for display 
                            // request the next frame in 1/60th of a second
                            requestAnimationFrame(updateCanvas);
                        }
                        
                        $scope.videoContainer.video.play();
                    };

                    $scope.$watch('msg', function(msg) {
                        const svgns = "http://www.w3.org/2000/svg";
                        
                        if (!msg) {
                            // Ignore undefined msg
                            return;
                        }
                        
                        debugger;

                        if (msg.payload && Array.isArray(msg.payload)) {
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
/*
                                    { "action": "draw", "type": "rectangle", "points": [ { "lat": 50.61243889044519, "lng": -1.5913009643554688 }, { "lat": 50.66665471366635, "lng": -1.5913009643554688 }, { "lat": 50.66665471366635, "lng": -1.4742279052734375 }, { "lat": 50.61243889044519, "lng": -1.4742279052734375 } ] }
*/
                                        break;

                                    case "delete":

                                        if (action.name) {

                                            // TODO enkel in de children van de SVG zoeken ...
/*
                                            var elem = document.getElementById(action.name);

                                            elem.parentNode.removeChild(elem);
*/
                                        }
                                        break;
                                }
                            }
                        }

                         // The payload contains the new text, which we will store on the scope (in the model)
                        $scope.textContent = msg.payload;
                    });
                 
                    $scope.change = function() {
                        // The data will be stored in the model on the scope
                        $scope.send({payload: $scope.textContent});
                    };

                    $scope.enterkey = function(keyEvent){
                        if (keyEvent.which === 13) {
                            $scope.send({payload: $scope.textContent});
                        }
                    };
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
