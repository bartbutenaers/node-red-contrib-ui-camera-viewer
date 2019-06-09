/**
 * Copyright 2019 Bart Butenaers
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
    
    // TODO vraag: momenteel is de source in de config screen een dropdown (push/fetch).  Of kan dat beter een typedinput msg/str zijn ???
    // Mochten we een eigen typedinput ('URL') kunnen maken, dan was dat nog beter ...  Zie https://nodered.org/docs/api/ui/typedInput/#types-typedefinition   !!!!!

    function HTML(config) { 
        var preserveAspectRatio;
    
        // The configuration is a Javascript object, which needs to be converted to a JSON string
        var configAsJson = JSON.stringify(config);
        
        if (config.aspectratio === true) {
            // Keep the aspect ratio, i.e. don't stretch the image (= leave the remaining svg area empty)
            preserveAspectRatio = "xMidYMid meet";
        }
        else {
            // Don't keep the aspect ratio, i.e. stretch the image to fit the entire svg area
            preserveAspectRatio = "none";
        }

        // TODO in documentatie zetten dat image in SVG enkel JPEG en PNG supporteert
        // TODO by default een SVG text 'no image available' tonen
        var html = String.raw`
        <svg id="cam_svg_` + config.id + `" height="100%" width="100%" ng-init='init(` + configAsJson + `)' xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="border: 1px solid black;">
            <defs id="cam_def_` + config.id + `"></defs>        
            <image id="cam_img_` + config.id + `" width="100%" height="100%" preserveAspectRatio=` + preserveAspectRatio + `/>
        </svg>
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
    
    function UiCamViewerNode(config) {
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
                        // Remark: all client-side functions should be added here!  
                        // If added above, it will be server-side functions which are not available at the client-side ...
                        
                        // Handle the mouse click on the specified SVG button, by sending a message to the server
                        function handleClick(buttonName) {
                            // TODO gebruiker moet op config screen kunnen ingeven waar de output naartoe moet: msg.xxx (payload, topic ...)
                            $scope.send({topic: buttonName}); 
                        }
                                                     
                        // Setup all SVG elements for all the grid cells, as specified by the user in the config screen
                        function setupSvgElements() {
                            const svgns = "http://www.w3.org/2000/svg";
                            const svgxlink = "http://www.w3.org/1999/xlink";
                            
                            // ===================================================================================
                            // Show the specified widgets at the specified locations in the SVG drawing
                            // ===================================================================================
                            
                            // To be able to draw the widgets at the locations (specified by the user), we need to know which final
                            // size the SVG drawing has.  Since the SVG drawing fills (100%) the space made available by the dashboard,
                            // it is very hard to determine the final space (under all circumstances).  Therefore we will use relative
                            // positions, by using percentages (instead of real pixels).  However not all SVG shapes can have coordinates
                            // as percentages, like e.g. an SVG path.  And we can also not draw the shapes in the origin, and afterwards
                            // transform them to the specified location, since translation in SVG doesn't support percentage based
                            // coordinates.  However the 'use' tag does support percentage coordinates, however we have no access to
                            // the child elements inside a 'symbol' tag which is being used.  Indeed those child elements are stored
                            // in a shadow DOM.  But that means we cannot customize the symbol, so everywhere the same symbol layout 
                            // will be used.  This is not what we want, since the same symbol can be displayed multiple times but with
                            // other settings.  As an ultimate solution, this workaround seems to me the only possible way to go:
                            //   1. Create a dedicated 'symbol' for every widget, with a layout like requested by the user.
                            //   2. Create a 'use' element, that uses the symbol at a specified position (in relative percentages)
                            // Summarized we will create a DEDICATED symbol/use elements pair for EVERY widget in the drawing.

                            var widgetElement;
                            var symbolElement;
                            var useElement;
                            
                            for (var i = 0; i < $scope.config.widgetsInfo.length; i++) {
                                var widgetInfo = $scope.config.widgetsInfo[i];
                                                                
   // TODO test verwijderen
   widgetInfo.font = "Arial"
  widgetInfo.fontsize = 12 
  widgetInfo.type = "res"
  widgetInfo.displayMode = "always"
                                // All SVG elements required to draw the widget, should be added as child elements to the 'symbol'.
                                // The symbol will represent the widget in the ORIGIN, since it will be later on 'use'd at the required
                                // location inside the SVG drawing...
                                switch (widgetInfo.type) {
                                    case "fps":
                                        // Show the frames per second
                                        svgElement = document.createElementNS(svgns, 'text');
                                        svgElement.setAttributeNS(null, 'x', 0);
                                        svgElement.setAttributeNS(null, 'y', 0);
                                        svgElement.setAttributeNS(null, 'stroke', 'black');
                                        svgElement.setAttributeNS(null, 'stroke-width', '3px');
                                        svgElement.setAttributeNS(null, 'fill', 'white');
                                        svgElement.setAttributeNS(null, 'font-size', widgetInfo.fontSize)
                                        svgElement.setAttributeNS(null, 'font-family', widgetInfo.font);
                                        svgElement.setAttributeNS(null, 'font-weight', 'bold');
                                        svgElement.setAttributeNS(null, 'text-anchor', 'middle'); // horizontal
                                        svgElement.setAttributeNS(null, 'dominant-baseline', 'middle'); // vertical
                                        svgElement.setAttributeNS(null, 'paint-order', 'stroke');
                                        svgElement.innerHTML = "-- fps";
                                        $scope.defElement.appendChild(svgElement);
                                        
                                        // Keep a reference to the fps element for later
                                        $scope.fpsElements.push(svgElement);
                                        
                                        break;
                                    case "res":
                                        // TODO imagewidth and imageheight is the size of the svg drawing, not the size of the original image !!!
                                        var imageHeight = $scope.imgElement.height.animVal.value;
                                        var imageWidth = $scope.imgElement.width.animVal.value;

                                        // Show the resolution
                                        svgElement = document.createElementNS(svgns, 'text');
                                        svgElement.setAttributeNS(null, 'x', 0);
                                        svgElement.setAttributeNS(null, 'y', 0);
                                        svgElement.setAttributeNS(null, 'stroke', 'black');
                                        svgElement.setAttributeNS(null, 'stroke-width', '3px');
                                        svgElement.setAttributeNS(null, 'fill', 'white');
                                        svgElement.setAttributeNS(null, 'font-size', widgetInfo.fontSize)
                                        svgElement.setAttributeNS(null, "font-family", widgetInfo.font);
                                        svgElement.setAttributeNS(null, "font-weight", "bold");
                                        svgElement.setAttributeNS(null, 'text-anchor', 'middle'); // horizontal
                                        svgElement.setAttributeNS(null, 'dominant-baseline', 'middle'); // vertical
                                        svgElement.setAttributeNS(null, 'paint-order', 'stroke');
                                        svgElement.innerHTML = Math.round(imageWidth) + "x" + Math.round(imageHeight);
                                        $scope.defElement.appendChild(svgElement);
                                        break;
                                    case "pt": // Show the pan/tilt buttons
                                        var cell = {}; // TODO verwijderen
                                        cell.centerX = 0;
                                        cell.centerY = 0;
                                    
                                        // Create an SVG group, to treat all the elements as a single 'pt' widget
                                        var groupElement = document.createElementNS(svgns, 'g');
                                        $scope.defElement.appendChild(groupElement);

                                        // Show a large semi-transparent circle behind the buttons
                                        svgElement = document.createElementNS(svgns, "circle");
                                        svgElement.setAttributeNS(null, 'cx', cell.centerX);
                                        svgElement.setAttributeNS(null, 'cy', cell.centerY);
                                        svgElement.setAttributeNS(null, 'r', 45);
                                        svgElement.setAttributeNS(null, 'stroke', 'black');
                                        svgElement.setAttributeNS(null, 'stroke-width', '1px');
                                        svgElement.setAttributeNS(null, 'fill', 'grey');
                                        svgElement.setAttributeNS(null, 'opacity', '0.5'); // 0.0. is fully transparent
                                        groupElement.appendChild(svgElement);
                                        
                                        // Show a 'home' button
                                        points = (cell.centerX - 5) + ',' + (cell.centerY + 7) + ' ' +
                                                 (cell.centerX - 5) + ',' + (cell.centerY - 1) + ' ' +
                                                 (cell.centerX - 6) + ',' + (cell.centerY - 1) + ' ' +
                                                 (cell.centerX + 0) + ',' + (cell.centerY - 8) + ' ' +
                                                 (cell.centerX + 7) + ',' + (cell.centerY - 1) + ' ' +
                                                 (cell.centerX + 6) + ',' + (cell.centerY - 1) + ' ' +
                                                 (cell.centerX + 6) + ',' + (cell.centerY + 7);       
                                        svgElement = document.createElementNS(svgns, "polygon");
                                        svgElement.setAttributeNS(null, 'points', points);
                                        svgElement.setAttributeNS(null, 'stroke', 'black');
                                        svgElement.setAttributeNS(null, 'stroke-width', '3px');
                                        svgElement.setAttributeNS(null, 'fill', 'black');
                                        svgElement.setAttributeNS(null, 'opacity', '1.0'); // 0.0. is fully transparent
                                        groupElement.appendChild(svgElement);
                                        
                                        // Show an invisible circle on top of the 'home' button, to capture mouse events in a larger area
                                        svgElement = document.createElementNS(svgns, "circle");
                                        svgElement.setAttributeNS(null, 'cx', cell.centerX);
                                        svgElement.setAttributeNS(null, 'cy', cell.centerY);
                                        svgElement.setAttributeNS(null, 'r', 15);
                                        svgElement.setAttributeNS(null, 'stroke', 'black');
                                        svgElement.setAttributeNS(null, 'stroke-width', '1px');
                                        svgElement.setAttributeNS(null, 'fill', 'white');
                                        svgElement.setAttributeNS(null, 'fill-opacity', '0.0'); // 0.0. is fully transparent
                                        svgElement.setAttributeNS(null, 'cursor', 'pointer');
                                        //svgElement.style.cursor = "pointer";
                                        groupElement.appendChild(svgElement);
                                        
                                        svgElement.addEventListener("click", function() { 
                                            handleClick('home'); 
                                        }, false);

                                        // Show an 'up' button
                                        // The buttons should have a white shadow, to make sure they are visible on light backgrounds
                                        points = (cell.centerX - 5) + ',' + (cell.centerY - 30) + ' ' + 
                                                 (cell.centerX + 0) + ',' + (cell.centerY - 35) + ' ' + 
                                                 (cell.centerX + 5) + ',' + (cell.centerY - 30);
                                        svgElement = document.createElementNS(svgns, "polygon");
                                        svgElement.setAttributeNS(null, 'points', points);
                                        svgElement.setAttributeNS(null, 'stroke', 'black');
                                        svgElement.setAttributeNS(null, 'stroke-width', '3px');
                                        svgElement.setAttributeNS(null, 'fill', 'black');
                                        svgElement.setAttributeNS(null, 'opacity', '1.0'); // 0.0. is fully transparent
                                        groupElement.appendChild(svgElement);
                                        
                                        // Show an invisible circle on top of the 'up' button, to capture mouse events in a larger area
                                        svgElement = document.createElementNS(svgns, "circle");
                                        svgElement.setAttributeNS(null, 'cx', cell.centerX);
                                        svgElement.setAttributeNS(null, 'cy', cell.centerY - 32);
                                        svgElement.setAttributeNS(null, 'r', 12);
                                        svgElement.setAttributeNS(null, 'stroke', 'none');
                                        svgElement.setAttributeNS(null, 'fill', 'white');
                                        svgElement.setAttributeNS(null, 'opacity', '0.0');
                                        svgElement.setAttributeNS(null, 'cursor', 'pointer');
                                        groupElement.appendChild(svgElement);
                                        
                                        svgElement.addEventListener("click", function() { 
                                            handleClick('up');
                                        }, false);
                                        
                                        // Show an 'down' button
                                        points = (cell.centerX - 5) + ',' + (cell.centerY + 30) + ' ' + 
                                                 (cell.centerX + 0) + ',' + (cell.centerY + 35) + ' ' + 
                                                 (cell.centerX + 5) + ',' + (cell.centerY + 30);
                                        svgElement = document.createElementNS(svgns, "polygon");
                                        svgElement.setAttributeNS(null, 'points', points);
                                        svgElement.setAttributeNS(null, 'stroke', 'black');
                                        svgElement.setAttributeNS(null, 'stroke-width', '3px');
                                        svgElement.setAttributeNS(null, 'fill', 'black');
                                        svgElement.setAttributeNS(null, 'opacity', '1.0'); // 0.0. is fully transparent
                                        groupElement.appendChild(svgElement);
                                        
                                        // Show an invisible circle on top of the 'down' button, to capture mouse events in a larger area
                                        svgElement = document.createElementNS(svgns, "circle");
                                        svgElement.setAttributeNS(null, 'cx', cell.centerX);
                                        svgElement.setAttributeNS(null, 'cy', cell.centerY + 32);
                                        svgElement.setAttributeNS(null, 'r', 12);
                                        svgElement.setAttributeNS(null, 'stroke', 'none');
                                        svgElement.setAttributeNS(null, 'fill', 'white');
                                        svgElement.setAttributeNS(null, 'opacity', '0.0');
                                        svgElement.setAttributeNS(null, 'cursor', 'pointer');
                                        groupElement.appendChild(svgElement);
                                        
                                        svgElement.addEventListener("click", function() { 
                                            handleClick('down');
                                        }, false);

                                        // Show an 'left' button
                                        points = (cell.centerX - 30) + ',' + (cell.centerY - 5) + ' ' + 
                                                 (cell.centerX - 35) + ',' + (cell.centerY + 0) + ' ' + 
                                                 (cell.centerX - 30) + ',' + (cell.centerY + 5);
                                        svgElement = document.createElementNS(svgns, "polygon");
                                        svgElement.setAttributeNS(null, 'points', points);
                                        svgElement.setAttributeNS(null, 'stroke', 'black');
                                        svgElement.setAttributeNS(null, 'stroke-width', '3px');
                                        svgElement.setAttributeNS(null, 'fill', 'black');
                                        svgElement.setAttributeNS(null, 'opacity', '1.0'); // 0.0. is fully transparent
                                        groupElement.appendChild(svgElement);
                                        
                                        // Show an invisible circle on top of the 'left' button, to capture mouse events in a larger area
                                        svgElement = document.createElementNS(svgns, "circle");
                                        svgElement.setAttributeNS(null, 'cx', cell.centerX - 32);
                                        svgElement.setAttributeNS(null, 'cy', cell.centerY);
                                        svgElement.setAttributeNS(null, 'r', 12);
                                        svgElement.setAttributeNS(null, 'stroke', 'none');
                                        svgElement.setAttributeNS(null, 'fill', 'white');
                                        svgElement.setAttributeNS(null, 'opacity', '0.0');
                                        svgElement.setAttributeNS(null, 'cursor', 'pointer');
                                        groupElement.appendChild(svgElement);
                                        
                                        svgElement.addEventListener("click", function() { 
                                            handleClick('left');
                                        }, false);
                                        
                                        // Show an 'right' button
                                        points = (cell.centerX + 30) + ',' + (cell.centerY - 5) + ' ' + 
                                                 (cell.centerX + 35) + ',' + (cell.centerY + 0) + ' ' + 
                                                 (cell.centerX + 30) + ',' + (cell.centerY + 5);
                                        svgElement = document.createElementNS(svgns, "polygon");
                                        svgElement.setAttributeNS(null, 'points', points);
                                        svgElement.setAttributeNS(null, 'stroke', 'black');
                                        svgElement.setAttributeNS(null, 'stroke-width', '3px');
                                        svgElement.setAttributeNS(null, 'fill', 'black');
                                        svgElement.setAttributeNS(null, 'opacity', '1.0'); // 0.0. is fully transparent
                                        groupElement.appendChild(svgElement);  
                                        
                                        // Show an invisible circle on top of the 'right' button, to capture mouse events in a larger area
                                        svgElement = document.createElementNS(svgns, "circle");
                                        svgElement.setAttributeNS(null, 'cx', cell.centerX + 32);
                                        svgElement.setAttributeNS(null, 'cy', cell.centerY);
                                        svgElement.setAttributeNS(null, 'r', 12);
                                        svgElement.setAttributeNS(null, 'stroke', 'none');
                                        svgElement.setAttributeNS(null, 'fill', 'white');
                                        svgElement.setAttributeNS(null, 'opacity', '0.0');
                                        svgElement.setAttributeNS(null, 'cursor', 'pointer');
                                        groupElement.appendChild(svgElement);

                                        svgElement.addEventListener("click", function() { 
                                            handleClick('right'); 
                                        }, false);        

                                        // Make sure the groupElement is used below by the 'use' element
                                        svgElement = groupElement;
                                        
                                        break;
                                    case "zoom":
                                        // TODO Show the zoom in/out buttons
                                        break;
                                    case "stst":
                                        var cell = {}; // TODO verwijderen
                                        cell.centerX = 0;
                                        cell.centerY = 0;

                                        // Create an SVG group, to treat all the elements as a single 'stst' widget
                                        var groupElement = document.createElementNS(svgns, 'g');
                                        $scope.defElement.appendChild(groupElement);

                                        // Show a semi-transparent circle behind the button
                                        svgElement = document.createElementNS(svgns, "circle");
                                        svgElement.setAttributeNS(null, 'cx', cell.centerX);
                                        svgElement.setAttributeNS(null, 'cy', cell.centerY);
                                        svgElement.setAttributeNS(null, 'r', 25);
                                        svgElement.setAttributeNS(null, 'fill', 'grey');
                                        svgElement.setAttributeNS(null, 'opacity', '0.5'); // 0.0. is fully transparent
                                        groupElement.appendChild(svgElement);
                                        
                                        // Show a 'start' button
                                        points = (cell.centerX - 10) + ',' + (cell.centerY - 10) + ' ' + 
                                                 (cell.centerX + 10) + ',' + (cell.centerY +  0) + ' ' + 
                                                 (cell.centerX - 10) + ',' + (cell.centerY + 10);
                                        svgElement = document.createElementNS(svgns, "polygon");
                                        svgElement.setAttributeNS(null, 'points', points);
                                        svgElement.setAttributeNS(null, 'stroke', 'none');
                                        svgElement.setAttributeNS(null, 'fill', 'black');
                                        svgElement.setAttributeNS(null, 'opacity', '1.0'); // 0.0. is fully transparent
                                        //svgElement.setAttributeNS('ng-hide', 'isPlaying'); // Hide when $scope.isPlaying is true
                                        svgElement.setAttribute('class','cam_viewer_start');
                                        groupElement.appendChild(svgElement);
                                        
                                        points = (cell.centerX - 10) + ',' + (cell.centerY - 10) + ' ' + 
                                                 (cell.centerX - 10) + ',' + (cell.centerY + 10) + ' ' + 
                                                 (cell.centerX + 10) + ',' + (cell.centerY + 10) + ' ' +
                                                 (cell.centerX + 10) + ',' + (cell.centerY - 10);
                                        svgElement = document.createElementNS(svgns, "polygon");
                                        svgElement.setAttributeNS(null, 'points', points);
                                        svgElement.setAttributeNS(null, 'stroke', 'none');
                                        svgElement.setAttributeNS(null, 'fill', 'black');
                                        svgElement.setAttributeNS(null, 'opacity', '1.0'); // 0.0. is fully transparent
                                        //svgElement.setAttributeNS('ng-show', 'isPlaying'); // Show when $scope.isPlaying is true
                                        svgElement.setAttribute('class','cam_viewer_stop');
                                        groupElement.appendChild(svgElement);
                                        
                                        // Show an invisible circle on top of the 'right' button, to capture mouse events in a larger area
                                        svgElement = document.createElementNS(svgns, "circle");
                                        svgElement.setAttributeNS(null, 'cx', cell.centerX);
                                        svgElement.setAttributeNS(null, 'cy', cell.centerY);
                                        svgElement.setAttributeNS(null, 'r', 25);
                                        svgElement.setAttributeNS(null, 'stroke', 'none');
                                        svgElement.setAttributeNS(null, 'fill', 'white');
                                        svgElement.setAttributeNS(null, 'opacity', '0.0');
                                        svgElement.setAttributeNS(null, 'cursor', 'pointer');
                                        groupElement.appendChild(svgElement);
                                        
                                        svgElement.addEventListener("click", function() {
                                            // The content of the message (to the server) depends on the current playing status
                                            if ($scope.isPlaying) {
                                                handleClick('stop'); 
                                            }
                                            else {
                                                handleClick('start');
                                            }
                                            
                                            // Switch the playing status
                                            $scope.isPlaying = !$scope.isPlaying; 
                                            
                                            var startElements = document.getElementsByClassName("cam_viewer_start");
                                            var stopElements = document.getElementsByClassName("cam_viewer_stop");
                                            
                                            // When the viewer is currently playing, the 'play' buttons should be invisible.
                                            for (var i = 0; i < startElements.length; i++) {
                                                if ($scope.isPlaying) {
                                                    startElements[i].style.display = "none";
                                                }
                                                else {
                                                    startElements[i].style.display = "block";
                                                }
                                            }
                                            
                                            // When the viewer is currently not playing, the 'stop' buttons should be invisible.
                                            for (var j = 0; j < stopElements.length; j++) {
                                                if ($scope.isPlaying) {
                                                    stopElements[j].style.display = "block";
                                                }
                                                else {
                                                    stopElements[j].style.display = "none";
                                                }
                                            }                                              
                                        }, false);
                                        
                                        // Make sure the groupElement is used below by the 'use' element
                                        svgElement = groupElement;
                                        
                                        break;
                                    case "text":
                                        // TODO
                                        break;
                                }
                                
                                // TODO case toevoegen om preset posities toe te laten...
                                
                                // Each definition element should have a unique id, that can be used by the 'use' element
                                var defId = "cam_viewer_" + $scope.config.id + "_" + i; 
                                svgElement.setAttributeNS(null, 'id', defId);
                                
                                // Create an SVG 'use' element, that uses the symbol element at the specified location (relative percentages)
                                // Since SVG2 'xlink:href' is deprecated and need to be replaced 'href'.  For example on my Chrome browser the
                                // xlink prefix doesn't work anymore.  To be sure, we will add both attributes ...
                                // Moreover the xlink:href attribute belongs to a different Namespace
                                // (see https://stackoverflow.com/questions/55047998/scripted-use-of-svg-defs-use-xlinkhref-via-javascript-fails)
                                useElement = document.createElementNS(svgns, 'use');
                                useElement.setAttributeNS(svgns, 'href', "#" + defId);
                                useElement.setAttributeNS(svgxlink, 'xlink:href', "#" + defId);
                                useElement.setAttributeNS(null, 'x', widgetInfo.horizontal + "%");
                                useElement.setAttributeNS(null, 'y', widgetInfo.vertical + "%");
                                $scope.svgElement.appendChild(useElement);
                                
                                // Check out when the widget should be visible ...
                                switch( widgetInfo.displayMode) {
                                    case "always":
                                        // Nothing special needs to be done ...
                                        break;
                                    case "hoover":
                                        // Make sure the element can receive mouse events when it's visibility is 'hidden'.
                                        // Otherwise when can never show a hidden element again when hoovering it with the mouse.
                                        useElement.style.pointerEvents = "all";
                                        
                                        // The element should be hidden by default.
                                        // Don't use this.style.display = "hidden".  Because then the svg element isn't drawn,
                                        // so it cannot receive (mouse) events anymore.  Which means it would stay invisible ...
                                        useElement.style.visibility="hidden";
                            
                                        useElement.addEventListener("mouseout", function() { 
                                            this.style.visibility="hidden";
                                        }, false);
                                        
                                        useElement.addEventListener("mouseenter", function() {  
                                            this.style.visibility="visible";
                                        }, false);
                                    
                                        break;
                                }
                            }
                        }
                        
                        $scope.flag = true;
                
                        $scope.init = function (config) {
                            $scope.config = config;
                            
                            // Create a new empty array, where fps elements can be stored
                            $scope.fpsElements = [];
                            
                            // TODO moeten we wel de images als (base) encoded string doorgeven, of kunnen we gewoon een binary doorgeven?
                            // TODO moeten we iets voorzien om intern base te maken?  En moet dat automatisch gedetecteerd worden, of ergens manueel aanvinken?

                            // Remember whether the widget is currently in 'playing' mode or not.
                            // At startup we will use the autoPlay value, which has been specified in the config screen.
                            $scope.isPlaying = config.autoplay || false;
                            
                            // Store the references to the DOM elements (for SVG drawing and background image) as scope variables, 
                            // so you don't have search through the DOM tree over and over again ...
                            $scope.svgElement = document.getElementById("cam_svg_" + config.id);
                            $scope.imgElement = document.getElementById("cam_img_" + config.id);
                            $scope.defElement = document.getElementById("cam_def_" + config.id)
                            
                            debugger;
                            
                            // TODO hieronder rond de setInterval nog een apply zetten om een $timeout na te bootsen

                            // When drawing SVG elements on top of the background image, the SVG drawing should have received its final size.
                            // Indeed the SVG element has width and height 100%, so it will fill the available space AFTER the DOM tree has been rendered.
                            // So we need to wait until the DOM tree has been loaded completely, otherwise we will use the original SVG size and draw
                            // all the SVG elements at wrong position.  Only the following trick worked fine in my tests:
                            // See https://www.jstips.co/en/javascript/detect-document-ready-in-pure-js/
                            var stateCheck = setInterval(() => {
                                if (document.readyState === 'complete') {
                                    clearInterval(stateCheck);
                                    
                                    setupSvgElements();
                                }
                            }, 100);
                      
                            
                            // TODO knopje op config screen (bij 'websocket push' om images tegen te houden indien widget invisible.  Default aan)
                            
                            $scope.executionTimes = [];
                            
                            switch (config.source) {
                                case "push":
                                
                                    break;
                                    
                                case "fetch":
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
                                        requestAnimationFrame(updateSvgImage);
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
                        }
                        
                        function updateSvgImage(){
                            // ==================================================================================
                            // Update FPS
                            // ==================================================================================
                            
                            // Calculate the fps (frames per second)
                            // See https://www.growingwiththeweb.com/2017/12/fast-simple-js-fps-counter.html
                            const now = Date.now();
                            while ($scope.executionTimes.length > 0 && $scope.executionTimes[0] <= now - 1000) {
                              $scope.executionTimes.shift();
                            }
                            $scope.executionTimes.push(now);
                            
                            // For performance, only update the fps on the widget when its value has changed
                            if ($scope.fps !== $scope.executionTimes.length) {
                                $scope.fps = $scope.executionTimes.length;
                                
                                // Show the new fps in all fps elements
                                for (var i = 0; i < $scope.fpsElements.length; i++) {
                                    $scope.fpsElements[i].innerHTML = Math.round($scope.fps) + " fps";
                                }
                            }

                            // ==================================================================================
                            // Update image
                            // ==================================================================================
                            
                            var image;
                            
                            // only draw if loaded and ready
                            if($scope.videoContainer !== undefined && $scope.videoContainer.ready){ 
                                // The decoded video image should be resized to fit the canvas.
                                // See https://sdqali.in/blog/2013/10/03/fitting-an-image-in-to-a-canvas-object/
                                image = $scope.videoContainer.video;
                            }
                            else {
                                // When a (base64 encoded) image is supplied in msg.payload, then show it in the SVG image element
                                if ($scope.msg.payload) {
                                    // TODO aan server side controleren 'bij push' dat de message payload een base64 encoded string bevat
                                    var url = 'data:image/jpeg;base64,' + $scope.msg.payload;
                                    $scope.imgElement.setAttributeNS('http://www.w3.org/1999/xlink', 'href', url);
                                }
                            }
                            
                            // TODO wat als image = null??  Dan moet eigenlijk bovenstaane execution time berekening ook niet gebueren.  
                            
                            
                            if ($scope.config.source === "fetch") {
                                var imageWidth = $scope.videoContainer.video.videoWidth;
                                var imageHeight = $scope.videoContainer.video.videoHeight;
                                    
                                // TODO De resizing moet instelbaar worden (horizontal, vertical, full).
                                    
                                var canvasWidth = $scope.svgElement.width;
                                var canvasHeight = $scope.svgElement.height;
                                var imageAspectRatio = imageWidth / imageHeight;
                                var canvasAspectRatio = canvasWidth / canvasHeight;
                                var renderableHeight, renderableWidth, xStart, yStart;
        // TODO kunnen we hier de preserveAspectRatio niet gebruiken ??????????????????????????
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
                            }
                            
                            
                            // Draw the decoded video image in the canvas, with the calculated scaling
                            //$scope.ctx.drawImage($scope.videoContainer.video, xStart, yStart, renderableWidth, renderableHeight);
    //TODO                            $scope.ctx.drawImage($scope.videoContainer.video, 0, 0, imageWidth, imageHeight);
    /*TODO                           
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

                            if ($scope.config.source === "fetch") {
                                // We should only fetch the next image, as soon as the browser is ready to do that.
                                // This is not required when the images are pushed (via websocket), since then the 
                                // Node-RED flow determines when the next image arrives.
                                requestAnimationFrame(updateSvgImage);
                            }*/
                        }

                        $scope.$watch('msg', function(msg) {
                            const svgns = "http://www.w3.org/2000/svg";
                            
                            if (!msg) {
                                // Ignore undefined msg
                                return;
                            }
                            
                            debugger;
                            
                            // When the images are being pushed, let's get the image from the message
                            if ($scope.config.source === "push") {
                                updateSvgImage();
                            }
    /*
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
                                
                                
                                //for (var i = 0; i < msg.payload.length; i++) {
                                //    var element = null;
                                //    var action = msg.payload[i];
                                //    if (action.name) {
                                //        // If the element exist already, we will delete it first
                                //        element = document.getElementById(action.name);
                                //    }
                                //    
                                //    var svgElement = document.getElementById("camera-" + $scope.config.id);
                                //    switch (action.action) {
                                //        case "draw":
                                //            //var strokeColor =
                                //            switch (action.type) {
                                //                case "polygon":
                                //                    var points = "";
                                //                
                                //                    var showPoints = action.showPoints;
                                //                    var fillPattern = action.fillPattern;
                                //                    
                                //                    var clickable = action.clickable;
                                //                    
                                //                    for (var j = 0; j < action.points.length; j++) {
                                //                        points += action.points[j].x;
                                //                        points += ",";
                                //                        points += action.points[j].y;
                                //                       points += " ";
                                //                    }
                                //                    
                                //                    points = points.trim();
                                //                    
                                //                    var polygon = document.createElementNS(svgns, "polygon");
                                //                    polygon.setAttributeNS(null, "points", points);
                                //                    polygon.setAttributeNS(null, "fill", action.fillColor);
                                //                    polygon.setAttributeNS(null, "stroke", action.color);
                                //                    svgElement.appendChild(polygon);
                                //                    // De showpoints moet markers tekenen
                                //                    // https://vanseodesign.com/web-design/svg-markers/
                                //                    // TODO polygon tekenen
                                //                    break;
                                //                case "object":
                                //                    // TODO error if not available
                                //                    var points = action.points;
                                //                    var strokeColor = action.strokeColor; // TODO other name ???
                                //                    var fillColor = action.fillColor;
                                //                    var showPoints = action.showPoints; 
                                //                    var fillPattern = action.fillPattern;
                                //                    // Voor pattern zie https://css-tricks.com/simple-patterns-for-separation/
                                //                    // http://iros.github.io/patternfills/sample_svg.html
                                //                    // https://github.com/iros/patternfills (npm install -g patternfills)
                                //                    // https://stackoverflow.com/questions/13378797/how-to-dynamically-change-the-image-pattern-in-svg-using-javascript
                                //                    //TODO rectangle tekenen
                                //            }
                                //            break;
                                //        case "delete":
                                //            if (action.name) {
                                //                // TODO enkel in de children van de SVG zoeken ...
                                //                var elem = document.getElementById(action.name);
                                //                elem.parentNode.removeChild(elem);
                                //            }
                                //            break;
                                //    }
                                //}
                            }
                            */
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

    RED.nodes.registerType("ui_cam_viewer", UiCamViewerNode);
    
    // Make all the static resources from this node public available (i.e. third party JQuery plugin tableHeadFixer.js).
    // TODO is dit nodig?  of gewoon een script file includen op de html
    RED.httpAdmin.get('/cam_viewer/js/*', function(req, res){
        var options = {
            root: __dirname /*+ '/lib/'*/,
            dotfiles: 'deny'
        };
       
        // Send the requested file to the client (in this case it will be tableHeadFixer.js)
        res.sendFile(req.params[0], options)
    });
}
