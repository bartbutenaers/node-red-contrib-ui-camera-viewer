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
    
    // Mochten we een eigen typedinput ('URL') kunnen maken, dan was dat nog beter ...  Zie https://nodered.org/docs/api/ui/typedInput/#types-typedefinition   !!!!!

    function HTML(config) { 
        var width;
        var height;
        var videoPart;

        // The configuration is a Javascript object, which needs to be converted to a JSON string
        var configAsJson = JSON.stringify(config);
        
        // TODO rewrite this part based on css (https://stackoverflow.com/a/14422136)
        switch (config.aspectratio) {
            case "fit":
                // Keep the aspect ratio and leave the remaining svg area empty.
                width = "auto";
                height = "100%"; // stretchy
                break;
            case "crop":
                // Keep the aspect ratio and crop part of the image, to fit it in the shortest dimension.
                width = "100%"; // stretchx
                height = "auto";
                break;
            case "stretch":
                // Don't keep the aspect ratio, i.e. stretch the image in both directions to fit the entire svg area
                width = "100%";
                height = "100%";
                break;
        }
        
        var sourceStyle = "z-index:1; position: relative; width: " + width + "; height: " + height + "; max-width: none; max-height: none; top: 50%; transform: translateY(-50%);";
        
        switch (config.source) {
            case "push":
                // When images are pushed to this widget, they should be displayed in an HTML5 <img> element
                videoPart = String.raw`<img id="cam_img_` + config.id + `" src="" alt="Your browser does not support the HTML5 Image element" style="` + sourceStyle + `">`;
                break;
            case "pull":
                // When images are pulled by this widget, they should be displayed in an HTML5 <video> element.
                // Some modern browsers expect the audio to be muted, when you want to auto-play the video.
                videoPart = `<video id="cam_vid_` + config.id + `" src="` + config.pullSource.value + `" muted style="` + sourceStyle + `">
                                <p>Your browser does not support the HTML5 Video element.</p>
                             </video>`;
                break;
        }
        
        // Parent div container.
        // Set height to 'auto' (instead of 100%) because otherwise you will get a vertical scrollbar: reason is that the height or width of the element, are
        // the first thing that will be calculated. Only afterwards the margins and paddings are added. So if you have an element with a height of 100% and top
        // and bottom margins (applied by the Node-RED parent elements) of 10 pixels each, there will be a scroll bar for the extra 20 pixels.
        // See more detail on https://www.lifewire.com/set-height-html-element-100-percent-3467075         
        var html = String.raw`<div style="width: 100%; height: 100%; overflow: hidden; border: 1px solid black;" ng-init='init(` + configAsJson + `)'>
                                ` + videoPart + `
                                <svg id="cam_svg_` + config.id + `" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="position: absolute; z-index: 2; left: 0px; top: 0px; width: 100%; height: 100%;">
                                    <defs id="cam_def_` + config.id + `"></defs>        
                                </svg>
                              </div>`;
        return html;
    }

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
                            $scope.send({payload: buttonName}); 
                        }
                        
                        function getLedGradientColors(ledColor) {
                            // Led lights used from https://en.wikipedia.org/wiki/File:ButtonGreen.svg
                            switch (ledColor) {
                                case "green":
                                    return {
                                        color1: "#9f9",
                                        color2: "#0e0",
                                        color3: "#0d0"
                                    }
                                case "red":
                                    return {
                                        color1: "#f99",
                                        color2: "#f11",
                                        color3: "#c00"
                                    }                                            
                                case "blue":
                                    return {
                                        color1: "#99f",
                                        color2: "#00e",
                                        color3: "#00d"
                                    }                                            
                                case "orange":
                                    return {
                                        color1: "#fd9",
                                        color2: "#fb3",
                                        color3: "#f80"
                                    }                                            
                                case "yellow":
                                    return {
                                        color1: "#ff9",
                                        color2: "#ee0",
                                        color3: "#cc0"
                                    }                                          
                                case "white":
                                    return {
                                        color1: "#fff",
                                        color: "#ddd",
                                        color3: "#bbb"
                                    }                                           
                                case "grey":
                                    return {
                                        color1: "#ccc",
                                        color2: "#777",
                                        color3: "#555"
                                    }                                                                                 
                            }
                            
                            // Unsupported LED color
                            return null;
                        }
                                                     
                        // Setup all SVG elements for all the grid cells, as specified by the user in the config screen
                        function setupSvgElements() {
                            const svgns = "http://www.w3.org/2000/svg";
                            const svgxlink = "http://www.w3.org/1999/xlink";
                    debugger;        
                    // TODO de no_image ook tonen indine geen video
                    // TODO de typedinput (voor push) toont gen grijs boxje vooraan
                    // TODO het 'str' typed input best door een 'url' vervangen + de default waarde niet op 'payload' zetten
                            if ( $scope.imgElement) {
                                // At startup, show a 'no camera' image
                                // TODO Credit the author by putting on of the following two links on my readme page:
                                //     <div>Icon made from <a href="http://www.onlinewebfonts.com/icon">Icon Fonts</a> is licensed by CC BY 3.0</div>
                                //     <a href="http://www.onlinewebfonts.com">oNline Web Fonts</a>
                                $scope.imgElement.setAttribute('src', "cam_viewer/resources/no_camera.png");
                            }
                            
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
                            
                            for (var i = 0; i < $scope.config.widgetsInfo.length; i++) {
                                var widgetInfo = $scope.config.widgetsInfo[i];
                                
                                // Make sure the widget name is case insensitive
                                widgetInfo.name = (widgetInfo.name || "").toUpperCase();

                                // All SVG elements required to draw the widget, should be added as child elements to the 'symbol'.
                                // The symbol will represent the widget in the ORIGIN, since it will be later on 'use'd at the required
                                // location inside the SVG drawing...
                                switch (widgetInfo.type) {
                                    case "fps":
                                        // Show the frames per second
                                        var svgElement = document.createElementNS(svgns, 'text');
                                        svgElement.setAttributeNS(null, 'x', 0);
                                        svgElement.setAttributeNS(null, 'y', 0);
                                        svgElement.setAttributeNS(null, 'stroke', 'black');
                                        svgElement.setAttributeNS(null, 'stroke-width', '3px');
                                        svgElement.setAttributeNS(null, 'fill', widgetInfo.fontColor);
                                        svgElement.setAttributeNS(null, 'font-size', widgetInfo.fontSize)
                                        svgElement.setAttributeNS(null, 'font-family', widgetInfo.fontFamily);
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
                                        var svgElement = document.createElementNS(svgns, 'text');
                                        svgElement.setAttributeNS(null, 'x', 0);
                                        svgElement.setAttributeNS(null, 'y', 0);
                                        svgElement.setAttributeNS(null, 'stroke', 'black');
                                        svgElement.setAttributeNS(null, 'stroke-width', '3px');
                                        svgElement.setAttributeNS(null, 'fill', widgetInfo.fontColor);
                                        svgElement.setAttributeNS(null, 'font-size', widgetInfo.fontSize)
                                        svgElement.setAttributeNS(null, "font-family", widgetInfo.fontFamily);
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
                                        var svgElement = document.createElementNS(svgns, "circle");
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
                                    case "icon":
                                        // Create an SVG group, to treat all the elements as a single 'icon' widget
                                        var groupElement = document.createElementNS(svgns, 'g');
                                        $scope.defElement.appendChild(groupElement);

                                        // Show a round button
                                        // TODO button size should be adapted to the font size, to make sure it is still a bit bigger ..
                                        var svgElement = document.createElementNS(svgns, "circle");
                                        svgElement.setAttributeNS(null, 'cx', 0);
                                        svgElement.setAttributeNS(null, 'cy', 0);
                                        svgElement.setAttributeNS(null, 'r', 15);
                                        svgElement.setAttributeNS(null, 'fill', 'grey');
                                        svgElement.setAttributeNS(null, 'opacity', '0.5'); // 0.0. is fully transparent
                                        groupElement.appendChild(svgElement);
                                        
                                        // Show a FontAwesome icon in the button
                                        // The users should select the icon css code from https://fontawesome.com/v4.7.0/cheatsheet/
                                        svgElement = document.createElementNS(svgns, 'text');
                                        svgElement.setAttributeNS(null, 'x', 0);
                                        svgElement.setAttributeNS(null, 'y', 0);
                                        svgElement.setAttributeNS(null, 'stroke', 'black');
                                        svgElement.setAttributeNS(null, 'stroke-width', '3px');
                                        svgElement.setAttributeNS(null, 'fill', widgetInfo.fontColor);
                                        svgElement.setAttributeNS(null, 'font-size', widgetInfo.fontSize)
                                        svgElement.setAttributeNS(null, "font-family", "FontAwesome");
                                        svgElement.setAttributeNS(null, "font-weight", "bold");
                                        svgElement.setAttributeNS(null, 'text-anchor', 'middle'); // horizontal
                                        svgElement.setAttributeNS(null, 'dominant-baseline', 'middle'); // vertical // TODO not really in the center for some reason (weird because it works fine in  https://stackoverflow.com/a/52719480)
                                        svgElement.setAttributeNS(null, 'paint-order', 'stroke');
                                        svgElement.innerHTML = widgetInfo.icon;
                                        groupElement.appendChild(svgElement);
                                        
                                        // Show an invisible circle on top of the 'preset' button, to capture mouse events in the entire area
                                        svgElement = document.createElementNS(svgns, "circle");
                                        svgElement.setAttributeNS(null, 'cx', 0);
                                        svgElement.setAttributeNS(null, 'cy', 0);
                                        svgElement.setAttributeNS(null, 'r', 15);
                                        svgElement.setAttributeNS(null, 'stroke', 'none');
                                        svgElement.setAttributeNS(null, 'fill', 'white');
                                        svgElement.setAttributeNS(null, 'opacity', '0.0');
                                        svgElement.setAttributeNS(null, 'cursor', 'pointer');
                                        groupElement.appendChild(svgElement);
                                        
                                        svgElement.addEventListener("click", function() {
                                            // The content of the message (to the server) is specified in the config screen, since multiple
                                            // icons can be added (each with their own specific content)
                                            handleClick(widgetInfo.output);                                             
                                        }, false);
                                        
                                        // Make sure the groupElement is used below by the 'use' element
                                        svgElement = groupElement;
                                        
                                        break;
                                    case "preset":
                                        // Create an SVG group, to treat all the elements as a single 'preset' widget
                                        var groupElement = document.createElementNS(svgns, 'g');
                                        $scope.defElement.appendChild(groupElement);

                                        // Show a round button
                                        // TODO button size should be adapted to the font size, to make sure it is still a bit bigger ..
                                        var svgElement = document.createElementNS(svgns, "circle");
                                        svgElement.setAttributeNS(null, 'cx', 0);
                                        svgElement.setAttributeNS(null, 'cy', 0);
                                        svgElement.setAttributeNS(null, 'r', 15);
                                        svgElement.setAttributeNS(null, 'fill', 'grey');
                                        svgElement.setAttributeNS(null, 'opacity', '0.5'); // 0.0. is fully transparent
                                        groupElement.appendChild(svgElement);
                                        
                                        // Show a number in the button
                                        svgElement = document.createElementNS(svgns, 'text');
                                        svgElement.setAttributeNS(null, 'x', 0);
                                        svgElement.setAttributeNS(null, 'y', 0);
                                        svgElement.setAttributeNS(null, 'stroke', 'black');
                                        svgElement.setAttributeNS(null, 'stroke-width', '3px');
                                        svgElement.setAttributeNS(null, 'fill', widgetInfo.fontColor);
                                        svgElement.setAttributeNS(null, 'font-size', widgetInfo.fontSize)
                                        svgElement.setAttributeNS(null, "font-family", widgetInfo.fontFamily);
                                        svgElement.setAttributeNS(null, "font-weight", "bold");
                                        svgElement.setAttributeNS(null, 'text-anchor', 'middle'); // horizontal
                                        svgElement.setAttributeNS(null, 'dominant-baseline', 'middle'); // vertical
                                        svgElement.setAttributeNS(null, 'paint-order', 'stroke');
                                        svgElement.innerHTML = widgetInfo.presetNumber;
                                        groupElement.appendChild(svgElement);
                                        
                                        // Show an invisible circle on top of the 'preset' button, to capture mouse events in the entire area
                                        svgElement = document.createElementNS(svgns, "circle");
                                        svgElement.setAttributeNS(null, 'cx', 0);
                                        svgElement.setAttributeNS(null, 'cy', 0);
                                        svgElement.setAttributeNS(null, 'r', 15);
                                        svgElement.setAttributeNS(null, 'stroke', 'none');
                                        svgElement.setAttributeNS(null, 'fill', 'white');
                                        svgElement.setAttributeNS(null, 'opacity', '0.0');
                                        svgElement.setAttributeNS(null, 'cursor', 'pointer');
                                        groupElement.appendChild(svgElement);
                                        
                                        svgElement.addEventListener("click", function() {
                                            // The content of the message (to the server) should contain the preset number
                                            handleClick('preset_' + widgetInfo.presetNumber);                                             
                                        }, false);
                                        
                                        // Make sure the groupElement is used below by the 'use' element
                                        svgElement = groupElement;
                                        
                                        break;
                                    case "stst":
                                        var cell = {}; // TODO verwijderen
                                        cell.centerX = 0;
                                        cell.centerY = 0;

                                        // Create an SVG group, to treat all the elements as a single 'stst' widget
                                        var groupElement = document.createElementNS(svgns, 'g');
                                        $scope.defElement.appendChild(groupElement);

                                        // Show a semi-transparent circle behind the button
                                        var svgElement = document.createElementNS(svgns, "circle");
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
                                                // When currently isn't playing, send a message to indicated that it:
                                                // - Has stopped playing in pull mode
                                                // - Should stop playing in push mode (i.e. the flow needs to stop pushing messages to it)
                                                //   TODO The server side part of this node should close the gate automatically in that case ...
                                                handleClick('stop'); 
                                                
                                                if ($scope.config.source === "pull") {
                                                    $scope.vidElement.pause(); 
                                                }
                                            }
                                            else {
                                                // When currently isn't playing, send a message to indicated that it:
                                                // - Has started playing in pull mode
                                                // - Should start playing in push mode (i.e. the flow needs to push messages to it)
                                                //   TODO The server side part of this node should open the gate automatically in that case ...
                                                handleClick('start');
                                                
                                                if ($scope.config.source === "pull") {
                                                    $scope.vidElement.play(); 
                                                }
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
                                    case "led":
                                        // Create an SVG group, to treat all the elements as a single 'led' widget
                                        var groupElement = document.createElementNS(svgns, 'g');
                                        $scope.defElement.appendChild(groupElement);
                                        
                                        // Led lights used from https://en.wikipedia.org/wiki/File:ButtonGreen.svg
                                        var ledGradientColors = getLedGradientColors(widgetInfo.ledColor);
                      
                                        var gradientId = "cam_viewer_" + $scope.config.id + "_grad_" + i;

                                        // Create a radial gradient
                                        var gradientElement = document.createElementNS(svgns, "radialGradient");
                                        gradientElement.setAttributeNS(null, "id", gradientId);
                                        gradientElement.setAttributeNS(null, 'gradientUnits', 'objectBoundingBox');
                                        groupElement.appendChild(gradientElement);

                                        // The gradient has a start color
                                        svgElement = document.createElementNS(svgns, 'stop');
                                        svgElement.setAttributeNS(null, 'offset', '0%');
                                        svgElement.setAttributeNS(null, 'stop-color', ledGradientColors.color1);
                                        gradientElement.appendChild(svgElement);

                                        // The gradient has an intermediate color
                                        svgElement = document.createElementNS(svgns, 'stop');
                                        svgElement.setAttributeNS(null, 'offset', '70%');
                                        svgElement.setAttributeNS(null, 'stop-color', ledGradientColors.color2);
                                        gradientElement.appendChild(svgElement);

                                        // The gradient has an end color
                                        svgElement = document.createElementNS(svgns, 'stop');
                                        svgElement.setAttributeNS(null, 'offset', '100%');
                                        svgElement.setAttributeNS(null, 'stop-color', ledGradientColors.color3);
                                        gradientElement.appendChild(svgElement);

                                        // Show the LED as a circle with the radial gradient
                                        var svgElement = document.createElementNS(svgns, "circle");
                                        svgElement.setAttributeNS(null, 'cx', 0);
                                        svgElement.setAttributeNS(null, 'cy', 0);
                                        svgElement.setAttributeNS(null, 'r', 10);
                                        svgElement.setAttributeNS(null, 'stroke', 'white');
                                        svgElement.setAttributeNS(null, 'stroke-width', '3px');
                                        svgElement.setAttributeNS(null, 'fill', 'url(#' + gradientId + ')');           
                                        svgElement.setAttributeNS(null, 'opacity', '1.0');
                                        groupElement.appendChild(svgElement);

                                        // Make sure the groupElement is used below by the 'use' element
                                        svgElement = groupElement;
                                        
                                        break;
                                    case "text":
                                        // Show the specified label
                                        var svgElement = document.createElementNS(svgns, 'text');
                                        svgElement.setAttributeNS(null, 'x', 0);
                                        svgElement.setAttributeNS(null, 'y', 0);
                                        svgElement.setAttributeNS(null, 'stroke', 'black');
                                        svgElement.setAttributeNS(null, 'stroke-width', '3px');
                                        svgElement.setAttributeNS(null, 'fill', widgetInfo.fontColor);
                                        svgElement.setAttributeNS(null, 'font-size', widgetInfo.fontSize)
                                        svgElement.setAttributeNS(null, 'font-family', widgetInfo.fontFamily);
                                        svgElement.setAttributeNS(null, 'font-weight', 'bold');
                                        svgElement.setAttributeNS(null, 'text-anchor', 'middle'); // horizontal
                                        svgElement.setAttributeNS(null, 'dominant-baseline', 'middle'); // vertical // TODO not really in the center for some reason
                                        svgElement.setAttributeNS(null, 'paint-order', 'stroke');
                                        svgElement.innerHTML = widgetInfo.label;
                                        $scope.defElement.appendChild(svgElement);
                                        
                                        break;
                                }
                                
                                // Each definition element should have a unique id, that can be used by the 'use' element
                                var defId = "cam_viewer_" + $scope.config.id + "_" + i; 
                                svgElement.setAttributeNS(null, 'id', defId);
                                
                                // Create an SVG 'use' element, that uses the symbol element at the specified location (relative percentages)
                                // Since SVG2 'xlink:href' is deprecated and need to be replaced 'href'.  For example on my Chrome browser the
                                // xlink prefix doesn't work anymore.  To be sure, we will add both attributes ...
                                // Moreover the xlink:href attribute belongs to a different Namespace
                                // (see https://stackoverflow.com/questions/55047998/scripted-use-of-svg-defs-use-xlinkhref-via-javascript-fails)
                                var useElement = document.createElementNS(svgns, 'use');
                                useElement.setAttributeNS(svgns, 'href', "#" + defId);
                                useElement.setAttributeNS(svgxlink, 'xlink:href', "#" + defId);
                                useElement.setAttributeNS(null, 'x', widgetInfo.x + "%");
                                useElement.setAttributeNS(null, 'y', widgetInfo.y + "%");
                                // Apply a (unique) widget name to the use element, so we can search a widget (to control it from an input message).
                                // The widget name will be stored in a custom attribute, which are part of the HTML5 standard.
                                // Problem is that the 'use' element is an SVG element, and custom attributes are not part of the XML standard (until SVG2).
                                // For more information, see https://stackoverflow.com/questions/15532371/do-svg-docs-support-custom-data-attributes
                                // However it seems that the custom attributes are currently already supported by most browsers:
                                // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/data-*
                                useElement.setAttributeNS(null, 'data-name', widgetInfo.name);
                                // Store the widget type also as a custom attribute on the use element.
                                useElement.setAttributeNS(null, 'data-type', widgetInfo.type);
                                $scope.svgElement.appendChild(useElement);
                                
                                // Check out when the widget should be visible ...
                                switch(widgetInfo.displayMode) {
                                    case "visible":
                                        // Nothing special needs to be done, since the style.display is 'block' by default ...
                                        break;
                                    case "invisible":
                                        useElement.style.display = 'none';
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
                            
                            // Store the references to the DOM elements (for SVG drawing and background image) as scope variables, 
                            // so you don't have search through the DOM tree over and over again ...
                            $scope.svgElement = document.getElementById("cam_svg_" + config.id);
                            $scope.imgElement = document.getElementById("cam_img_" + config.id);
                            $scope.defElement = document.getElementById("cam_def_" + config.id);
                            $scope.vidElement = document.getElementById("cam_vid_" + config.id);

                            // TODO knopje op config screen (bij 'websocket push' om images tegen te houden indien widget invisible.  Default aan)
                            
                            $scope.executionTimes = [];
                            
                            // Remember whether the widget is currently in 'playing' mode or not.
                            // At startup we will use the autoPlay value, which has been specified in the config screen.
                            $scope.isPlaying = config.autoplay || false;
                            
                            // Setup all SVG elements, like they have been specified on the config screen
                            setupSvgElements();
                            
                            if (config.autoplay) {
                                // TODO allow autoplay for "push" also ...
                                if ($scope.config.source === "pull") {
                                      $scope.vidElement.play();  
                                }
                            }
                        }
                        
                        function updateFPS(){
                            // Calculate the fps (frames per second)
                            // See https://www.growingwiththeweb.com/2017/12/fast-simple-js-fps-counter.html
                            // TODO dit ook voorzien in een event handler van het video element ...
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
                        }

                        $scope.$watch('msg', function(msg) { 
                            if (!msg) {
                                // Ignore undefined msg
                                return;
                            }
                            debugger;
                            
                            // TODO volgens Dave moet de content van ui_control uniek zijn, dus best aan server side er een prefix aan toevoegen
                            
                            // In pull mode, the input message can contain a new URL (in a specified msg field)
                            switch($scope.config.source) {
                               case "pull":
                                    // A new URL can only be specified via the input message, if a message field has been specified
                                    if ($scope.config.pullSource.type === "msg") {
                                        var url = msg[$scope.config.pullSource.value];
                                        
                                        if (url && (typeof url === 'string' || url instanceof String)) {
                                            $scope.imgElement.src = url;
                                        }
                                    }

                                   break;
                               case "push":
                                    // TODO boolean bijhouden (via image onload) om te zien of de vorige image reeds geladen is
                                    // When the images are being pushed, let's get the image from the message
                                    var image = msg[$scope.config.pushSource.value];

                                    // When a (base64 encoded) image is supplied in msg.payload, then show it in the SVG image element
                                    if (image && (typeof image === 'string' || image instanceof String)) {
                                        // TODO de fps ook updaten in pull mode
                                        updateFPS();
                                    
                                        // TODO aan server side controleren 'bij push' dat de message payload een base64 encoded string bevat
                                        var url = 'data:image/jpeg;base64,' + image;
                                        $scope.imgElement.setAttribute('src',url);
                                    }    

                                    break;
                            }

                            // Control messages need to be supplied like this:
                            // msg.ui_control = {'userdefined_led_name_1':{'color':'blue','visible':true,'blink':'fast'},'userdefined_led_name_2':{'visible':false}}
                            var uiControl = msg['ui_control'];

                            if (!uiControl) {
                                // Nothing to control ...
                                return;
                            }

                            if (typeof uiControl !== "object") {
                                console.error("The msg.ui_control contains no valid object");
                                return;
                            }

                            var widgetNames = Object.keys(uiControl);

                            for (var i = 0; i < widgetNames.length; i++) {
                                var widgetName = widgetNames[i];

                                // Get the SVG 'use' element that visualizes the specified widget (name)
                                var svgUseElements = $scope.svgElement.querySelectorAll('[data-name="' + widgetName.toUpperCase() + '"]');

                                if (svgUseElements.size === 0) {
                                    console.log("Widget with name '" + widgetName + "' not found");
                                    continue;
                                }

                                if (svgUseElements.size > 1) {
                                    console.log("Multiple widgets with name '" + widgetName + "' found");
                                    continue;
                                }

                                var svgUseElement = svgUseElements[0];           
                                var widgetProperties = uiControl[widgetName];

                                if (typeof widgetProperties !== "object") {
                                    console.error("The msg.ui_control contains no valid object for widget '" + widgetName + "'");
                                    continue;
                                }
                                
                                var widgetType = svgUseElement.getAttribute("data-type");

                                var widgetPropertyNames = Object.keys(widgetProperties);

                                for (var j = 0; j < widgetPropertyNames.length; j++) {
                                    propertyName  = widgetPropertyNames[j];
                                    propertyValue = widgetProperties[propertyName];
                                    
                                    // Since each element is based on its own definition element, let's get the underlying def element
                                    var defElementId = svgUseElement.href.baseVal.substring(1);
                                    var defElement = document.getElementById(defElementId);
                                            
                                    switch (propertyName) {
                                        case "visibility":
                                            if (propertyValue === "visible" && svgUseElement.style.display === "none") {
                                                svgUseElement.style.display = "block";
                                            }
                                            else if (propertyValue === "invisible" && svgUseElement.style.display !== "none") {
                                                svgUseElement.style.display = "none";
                                            }
                                            
                                            break;
                                        case "label":
                                            if (widgetType !== "text") {
                                                console.error("Only the label of text widgets can be set via the input message");
                                                continue;
                                            }
                                            
                                            // Set the new label of the 'text' element
                                            defElement.innerHTML = propertyValue;
                                            break;
                                        case "color":
                                            if (widgetType !== "led") {
                                                console.error("Only the color of LED widgets can be set via the input message");
                                                continue;
                                            }
                                            
                                            var ledGradientColors = getLedGradientColors(propertyValue);
                                            
                                            var gradientElement = defElement.children[0];
                                            gradientElement.children[0].setAttributeNS(null, 'stop-color', ledGradientColors.color1);
                                            gradientElement.children[1].setAttributeNS(null, 'stop-color', ledGradientColors.color2);
                                            gradientElement.children[2].setAttributeNS(null, 'stop-color', ledGradientColors.color3);
                                            break;
                                    }
                                }
                            }

                            // TODO if we ever need to draw patterns:
                            //   https://css-tricks.com/simple-patterns-for-separation/
                            //   http://iros.github.io/patternfills/sample_svg.html
                            //   https://github.com/iros/patternfills (npm install -g patternfills)
                            //   https://stackoverflow.com/questions/13378797/how-to-dynamically-change-the-image-pattern-in-svg-using-javascript
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
    
    // By default the UI path in the settings.js file will be in comment:
    //     //ui: { path: "ui" },
    // But as soon as the user has specified a custom UI path there, we will need to use that path:
    //     ui: { path: "mypath" },
    var uiPath = ((RED.settings.ui || {}).path) || 'ui';
	
    // Make all the static resources from this node public available (i.e. no_camera.png file), for the client-side dashboard widget.
    RED.httpNode.get('/' + uiPath + '/cam_viewer/resources/*', function(req, res){
        var options = {
            root: __dirname + '/resources/',
            dotfiles: 'deny'
        };
       
        // Send the requested file to the client
        res.sendFile(req.params[0], options)
    });
}
