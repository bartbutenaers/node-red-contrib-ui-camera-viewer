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
        
	// See https://stackoverflow.com/questions/40324916/video-tag-embedded-in-svg
        var html = String.raw`
        <svg version="1.1" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="border: 1px solid black;">
            <rect x="0" y="0" width="300" height="200"></rect>
            <foreignObject x="-151" y="-104" width="500" height="400">
                <video width="300" height="200" controls="" style="position: fixed; left: 151px; top: 104px;">
                    <source src="http://techslides.com/demos/sample-videos/small.mp4" type="video/mp4">
                </video>
            </foreignObject>
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
                    };

                    $scope.$watch('msg', function(msg) {
                        if (!msg) {
                            // Ignore undefined msg
                            return;
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
