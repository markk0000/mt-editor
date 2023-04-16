function mtInitEditor(initVars) {
    (function(initVars) {
        function exToPx(value) {
            var match = value.match(/^(.*)ex$/);
            return match ? (parseFloat(match[1]) * 8).toFixed(3) + 'px' : value;
        }

        function hasClass(element) {
            for (var child = element.firstElementChild; child; child = child.nextElementSibling)
                if (child.classList.length || hasClass(child)) return true;
            return false;
        }

        function addUtf8CharToBytes(bytes, offset, charCode) { // Uint8Array, Uint, Uint ⇒ Uint
            var position = offset;
            if (charCode < 0x80) {
                bytes[position++] = charCode;
            } else if (charCode < 0x800) {
                bytes[position++] = 0xc0 | (charCode >>> 6);
                bytes[position++] = 0x80 | (charCode & 0x3f);
            } else if (charCode < 0x10000) {
                bytes[position++] = 0xe0 | (charCode >>> 12);
                bytes[position++] = 0x80 | ((charCode >>> 6) & 0x3f);
                bytes[position++] = 0x80 | (charCode & 0x3f);
            } else if (charCode < 0x200000) {
                bytes[position++] = 0xf0 | (charCode >>> 18);
                bytes[position++] = 0x80 | ((charCode >>> 12) & 0x3f);
                bytes[position++] = 0x80 | ((charCode >>> 6) & 0x3f);
                bytes[position++] = 0x80 | (charCode & 0x3f);
            } else if (charCode < 0x4000000) {
                bytes[position++] = 0xf8 | (charCode >>> 24);
                bytes[position++] = 0x80 | ((charCode >>> 18) & 0x3f);
                bytes[position++] = 0x80 | ((charCode >>> 12) & 0x3f);
                bytes[position++] = 0x80 | ((charCode >>> 6) & 0x3f);
                bytes[position++] = 0x80 | (charCode & 0x3f);
            } else {
                bytes[position++] = 0xfc | (charCode >>> 30);
                bytes[position++] = 0x80 | ((charCode >>> 24) & 0x3f);
                bytes[position++] = 0x80 | ((charCode >>> 18) & 0x3f);
                bytes[position++] = 0x80 | ((charCode >>> 12) & 0x3f);
                bytes[position++] = 0x80 | ((charCode >>> 6) & 0x3f);
                bytes[position++] = 0x80 | (charCode & 0x3f);
            }
            return position;
        }

        function utf8CharLength(charCode) { // Uint ⇒ Uint
            return charCode < 0x80 ? 1 : charCode < 0x800 ? 2 : charCode < 0x10000 ? 3 : charCode < 0x200000 ? 4 : charCode < 0x4000000 ? 5 : 6;
        }

        function bytesFromText(text) { // String ⇒ Uint8Array
            var length = 0;
            for (var i = 0; i < text.length; i++)
                length += utf8CharLength(text.charCodeAt(i));

            var offset = 0;
            var bytes = new Uint8Array(length);
            for (var i = 0; i < text.length; i++)
                offset = addUtf8CharToBytes(bytes, offset, text.charCodeAt(i));

            return bytes;
        }

        function base64Encode(bytes) {
            var map = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '/'];
            var text = '';
            for (var i = 0; i < bytes.byteLength - 2; i += 3) {
                var value = bytes[i] << 16 | bytes[i + 1] << 8 | bytes[i + 2];
                text += map[(value >> 18) & 0x3f];
                text += map[(value >> 12) & 0x3f];
                text += map[(value >> 6) & 0x3f];
                text += map[value & 0x3f];
            }
            var remaining = bytes.byteLength - i;
            if (remaining == 2) {
                var value = bytes[i] << 8 | bytes[i + 1];
                text += map[(value >> 10) & 0x3f];
                text += map[(value >> 4) & 0x3f];
                text += map[(value << 2) & 0x3f];
                text += '=';
            } else if (remaining == 1) {
                var value = bytes[i];
                text += map[(value >> 2) & 0x3f];
                text += map[(value << 4) & 0x3f];
                text += '==';
            }
            return text;
        }

        function waitForElm(selector) {
            return new Promise(resolve => {
                if (document.querySelector(selector)) {
                    return resolve(document.querySelector(selector));
                }

                const observer = new MutationObserver(mutations => {
                    if (document.querySelector(selector)) {
                        resolve(document.querySelector(selector));
                        observer.disconnect();
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            });
        }

        function parseLatex(latexCode) {
            for (var i = 0; i < latexCode.length; i++) {
                // waitForElm('#' + latexCode[i][0]).then((elm) => {
                //     // console.log(elm.textContent);
                let node = document.querySelector('#' + latexCode[i][0]);
                let options = MathJax.getMetricsFor(node, true);
                var xmlHeader = '<' + '?xml version="1.0" encoding="UTF-8" standalone="no" ?' + '>\n';
                var svgStyle = document.getElementById('MJX-SVG-styles');

                let svgElement = MathJax.tex2svg(latexCode[i][1], options);
                let svg = svgElement.firstElementChild;

                svg.setAttribute('width', exToPx(svg.getAttribute('width')));
                svg.setAttribute('height', exToPx(svg.getAttribute('height')));
                svg.removeAttribute('style');
                svg.removeAttribute('focusable');
                svg.removeAttribute('role');

                if (svgStyle && hasClass(svg)) {
                    var style = document.createElementNS(svg.namespaceURI, 'style');
                    style.textContent = svgStyle.textContent;
                    svg.insertBefore(style, svg.firstElementChild);
                }

                var s = new XMLSerializer().serializeToString(svg);

                svgSourceCodeToDownload = xmlHeader + svg.outerHTML;
                var base64SourceCode = base64Encode(bytesFromText(svgSourceCodeToDownload));
                var img = document.createElement('img');
                img.src = 'data:image/svg+xml;base64,' + base64SourceCode;

                $('#' + latexCode[i][0])[0].replaceWith(img);
                // $('#' + latexCode[i][0])[0].appendChild(img);
                //$('#' + latexCode[i][0])[0].innerHTML = "</p>" + $('#' + latexCode[i][0])[0].innerHTML + "<p>";
            }
        }


        var oldVal = "";
        var gitHubToken = "";
        var githubUserName = "";
        gitHubToken = initVars.gitHubToken;

        var domIds = {
            mtRenderContainer: 'mtRenderContainer',
            mtTextArea: 'mtTextArea',
            mtOutput: 'mtOutput',
            mtBtnHeading: 'mtBtnHeading',
            mtBtnBold: 'mtBtnBold',
            mtBtnItalic: 'mtBtnItalic',
            mtBtnStrike: 'mtBtnStrike',
            mtBtnQuote: 'mtBtnQuote',
            mtBtnLink: 'mtBtnLink',
            mtBtnCode: 'mtBtnCode',
            mtBtnCodeBlock: 'mtBtnCodeBlock',
            mtBtnLatex: 'mtBtnLatex',
            mtBtnDownlod: 'mtBtnDownlod',
            /**/
            mtBtnUpload: 'mtBtnUpload',
            /**/
            mtBtnGithub: 'mtBtnGithub',
            /**/
            mtBtnEditor: 'mtBtnEditor',
            mtBtnUndo: 'mtBtnUndo',
            mtBtnRedo: 'mtBtnRedo',
            mtFileUpload: 'mtFileUpload',
            mtGithubInputToken: 'mtGithubInputToken',
            mtBtnSetToken: 'mtBtnSetToken',
            mtGithubUploadContainer: 'mtGithubUploadContainer',
            mtInputFileName: 'mtInputFileName',
            mtInputCommit: 'mtInputCommit',
            mtBtnUploadGithub: 'mtBtnUploadGithub',
            mtGithubMessages: 'mtGithubMessages',
            mtGithubPath: 'mtGithubPath',
            mtGithubBackInTree: 'mtGithubBackInTree',
            mtGithubDirectories: 'mtGithubDirectories',
            /**/
            mtEditorContainer: 'mtEditorContainer',
            /**/
            mtGithubContainer: 'mtGithubContainer',
            /**/
            mtFileContainer: 'mtFileContainer',
        };
        domIds = Object.assign(domIds, initVars.elementIds);

        var editorSize = {
            minHeight: null,
            height: "500px",
            maxHeight: null,
        }
        editorSize = Object.assign(editorSize, initVars.dimensions);

        let isSecond = false;
        let styleTextBuild = "";
        if (editorSize.minHeight != null) {
            styleTextBuild += "min-height:" + editorSize.minHeight;
            isSecond = true;
        }
        if (editorSize.height != null) {
            if (isSecond) {
                styleTextBuild += ";";
            }
            styleTextBuild += "height:" + editorSize.height;
            isSecond = true;
        }
        if (editorSize.maxHeight != null) {
            if (isSecond) {
                styleTextBuild += ";";
            }
            styleTextBuild += "max-height:" + editorSize.maxHeight;
            isSecond = true;
        }

        if (initVars.renderType == "full") {
            $('#' + domIds.mtRenderContainer).append(`<div class="mt-container"><div class="mt-menu">
                <ul>
                    <div>
                    <li>
                        <a id="mtBtnHeading" href="javascript:;" title="Heading">
                            <i class="fa-solid fa-heading"></i>
                        </a>
                    </li>
                    <li>
                        <a id="mtBtnBold" href="javascript:;" title="Bold">
                            <i class="fa-solid fa-bold"></i>
                        </a>
                    </li>
                    <li>
                        <a id="mtBtnItalic" href="javascript:;" title="Italic">
                            <i class="fa-solid fa-italic"></i>
                        </a>
                    </li>
                    <li>
                        <a id="mtBtnStrike" href="javascript:;" title="Strike trough">
                            <i class="fa-solid fa-strikethrough"></i>
                        </a>
                    </li>
                    </div>
                    <div>
                    <li>
                        <a id="mtBtnQuote" href="javascript:;" title="Quote">
                            <i class="fa-solid fa-quote-left"></i>
                        </a>
                    </li>
                    <li>
                        <a id="mtBtnLink" href="javascript:;" title="Link">
                            <i class="fa-solid fa-link"></i>
                        </a>
                    </li>
                    </div>
                    <div>
                    <li>
                        <a id="mtBtnCode" href="javascript:;" title="Code">
                            <i class="fa-solid fa-code"></i>
                        </a>
                    </li>
                    <li>
                        <a id="mtBtnCodeBlock" href="javascript:;" title="Code block">
                            <i class="fa-regular fa-file-code"></i>
                        </a>
                    </li>
                    <li>
                        <a id="mtBtnLatex" href="javascript:;" title="LaTeX">
                            <i class="fa-solid fa-square-root-variable"></i>
                        </a>
                    </li>
                    </div>
                    <div>
                    <li>
                        <a id="mtBtnDownlod" href="javascript:;" title="Download">
                            <i class="fa-solid fa-download"></i>
                        </a>
                    </li>
                    </div>
                    <div>
                    <li>
                        <a id="mtBtnUpload" href="javascript:;" title="Upload">
                            <i class="fa-solid fa-upload"></i>
                        </a>
                    </li>
                    <li>
                        <a id="mtBtnGithub" href="javascript:;" title="GitHub">
                            <i class="fa-brands fa-github"></i>
                        </a>
                    </li>
                    <li>
                        <a id="mtBtnEditor" href="javascript:;" title="Editor">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </a>
                    </li>
                    </div>
                    <div>
                    <li>
                        <a id="mtBtnUndo" href="javascript:;" title="Undo">
                            <i class="fa-solid fa-rotate-left"></i>
                        </a>
                    </li>
                    <li>
                        <a id="mtBtnRedo" href="javascript:;" title="Redo">
                            <i class="fa-solid fa-rotate-right"></i>
                        </a>
                    </li>
                    </div>
                </ul>
            </div>
            <div class="mt-control-container" style="` + styleTextBuild + `">
                <div id="mtEditorContainer" class="mt-input mt-50 ">
                    <textarea class="" id="mtTextArea" name="editor"></textarea>
                    <div id="mtGithubContainer" class="mt-github-container mt-hidden">
                        <div class="mt-title">
                            <h1>GITHUB</h1>
                        </div>
                        <div class="mt-github-input mt-token">
                            <div class="mt-input-container">
                                <div class="mt-input-row mt-center">
                                <a href="https://github.com/settings/tokens" target="_blank">
                                    <p>GITHUB Token (classic)</p>
                                </a>
                                    <p>(with workflow scope)</p>
                                    <input type="password" id="mtGithubInputToken">
                                </div>
                            </div>
                            <h2 id="mtBtnSetToken" class="mt-click">SET</h2>
                        </div>
                        <div id="mtGithubUploadContainer" class="mt-github-input mt-hidden">
                            <p>Upload Markdown Content Into Repository</p>
                            <div class="mt-input-container">
                                <div class="mt-input-row">
                                    <p>File Name</p>
                                    <input type="text" id="mtInputFileName">
                                </div>
                                <div class="mt-input-row">
                                    <p>Commit Message</p>
                                    <input type="text" id="mtInputCommit">
                                </div>
                            </div>
                            <h2 id="mtBtnUploadGithub" class="mt-click">UPLOAD</h2>
                        </div>
                        <div class="mt-repositories">
                            <p id="mtGithubPath" class="mt-path mt-hidden"></p>
                            <p id="mtGithubMessages" class="mt-path mt-hidden"></p>
                            <div id="mtGithubDirectories"></div>
                        </div>
                    </div>
                    <div id="mtFileContainer" class="mt-hidden mt-file-container">
                        <form enctype="multipart/form-data">
                            <input id="mtFileUpload" type="file" accept=".md" name="files[]" style="display:none;">
                            <h2>Upload .md file into editor</h2>
                            <label for="mtFileUpload">Select File</label>
                        </form>
                    </div>
                </div>
                <div id="mtOutput" class="mt-output mt-50"></div>
            </div></div>`);
        }




        function handleFileSelect(evt) {
            let files = evt.target.files; // FileList object
            let f = files[0];

            let reader = new FileReader();
            reader.onload = (function(theFile) {
                return function(e) {
                    jQuery("#" + domIds.mtTextArea).val(e.target.result);
                    $('#' + domIds.mtFileUpload).val('');

                    if (initVars.renderType == "full") {
                        showEditor();
                    }

                    runParse();
                };
            })(f);
            reader.readAsText(f);
        }

        function saveTextAsFile(textToWrite, fileNameToSaveAs) {
            var textFileAsBlob = new Blob([textToWrite], {
                type: 'text/plain'
            });
            var downloadLink = document.createElement("a");
            downloadLink.download = fileNameToSaveAs;
            downloadLink.innerHTML = "Download File";
            if (window.webkitURL != null) {
                // without actually adding it to the DOM.
                downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
            } else {
                // before it can be clicked.
                downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
                downloadLink.onclick = destroyClickedElement;
                downloadLink.style.display = "none";
                document.body.appendChild(downloadLink);
            }

            downloadLink.click();
        }

        ////////////////////////////////////////////////////////////
        function githubAuthProblem(data) {
            if (data['status'] == 401) {
                $("#" + domIds.mtGithubUploadContainer).addClass('mt-hidden');
                $("#" + domIds.mtGithubMessages).removeClass('mt-hidden');
                $("#" + domIds.mtGithubMessages).text("ERROR - Problem with authentication to the github repository. You entered wrong personal access tokens, or your toekn expired");
            }
        }

        function ajaxGetAvaibleRepos() {
            let reposNames = [];
            $.ajax({
                url: 'https://api.github.com/user/repos',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader("Authorization", "Bearer " + gitHubToken);
                    xhr.setRequestHeader("X-GitHub-Api-Version", "2022-11-28");
                },
                success: function(data) {
                    for (var i = 0; i < data.length; i++) {
                        reposNames.push(data[i]['full_name']);
                    }
                    ajaxFilterPush(reposNames, 0);
                },
                error: function(data) {
                    githubAuthProblem(data);
                }
            });
        }

        var pushRespositories = [];

        function ajaxFilterPush(reposNames, arrayPosition) {
            if (reposNames.length == arrayPosition) {
                htmlInsertRepositories();
                return;
            }
            $.ajax({
                url: 'https://api.github.com/repos/' + reposNames[arrayPosition] + '/collaborators/' + githubUserName + '/permission',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader("Authorization", "Bearer " + gitHubToken);
                    xhr.setRequestHeader("X-GitHub-Api-Version", "2022-11-28");
                },
                success: function(data) {
                    if (data['user']['permissions']['push']) {
                        pushRespositories.push(reposNames[arrayPosition]);
                        ajaxFilterPush(reposNames, ++arrayPosition);
                    }
                },
                error: function(data) {
                    ajaxFilterPush(reposNames, ++arrayPosition);
                }
            });
        }

        var repoHistory = null;

        function htmlInsertRepositories() {
            $('#' + domIds.mtGithubDirectories).empty();
            for (var i = 0; i < pushRespositories.length; i++) {
                $('#' + domIds.mtGithubDirectories).append('<p class="mt-repository">' + pushRespositories[i] + '</p>');
            }
            $('.mt-repository').click(function() {
                repoHistory = $(this).text();
                ajaxGetRepoContent();
            });


            $("#" + domIds.mtGithubUploadContainer).addClass('mt-hidden');

            $("#" + domIds.mtGithubPath).addClass('mt-hidden');
            $("#" + domIds.mtGithubMessages).removeClass('mt-hidden');
            $("#" + domIds.mtGithubMessages).text('Choose Repository');
        }

        var directoryHistory = [];
        var actualDirectory = [];
        var urlDirectory = "";

        function htmlInsertDirectories() {
            $('#' + domIds.mtGithubDirectories).empty();

            // $('#treeList').append('<input type="text" id="fileName">');
            // $('#treeList').append('<p>commit text</p>');


            $('#' + domIds.mtGithubDirectories).append('<p id="' + domIds.mtGithubBackInTree + '">...</p>');
            $('#' + domIds.mtGithubBackInTree).click(function() {
                if (directoryHistory.length > 0) {
                    directoryHistory.pop();
                    ajaxGetRepoContent();
                } else {
                    htmlInsertRepositories();
                }
            });

            var directoriesArray = [];
            var filesArray = [];

            for (var i = 0; i < actualDirectory.length; i++) {
                if (actualDirectory[i][1] == "dir") {
                    directoriesArray.push(actualDirectory[i][0]);
                } else {
                    filesArray.push(actualDirectory[i][0]);
                }
            }

            directoriesArray.sort();
            filesArray.sort();

            for (var i = 0; i < directoriesArray.length; i++) {
                $('#' + domIds.mtGithubDirectories).append('<p class="mt-directory">' + directoriesArray[i] + '</p>');
            }
            for (var i = 0; i < filesArray.length; i++) {
                $('#' + domIds.mtGithubDirectories).append('<p class="mt-file">' + filesArray[i] + '</p>');
            }
            $('.mt-directory').click(function() {
                directoryHistory.push($(this).text());
                ajaxGetRepoContent();
            });

            $('.mt-file').click(function() {
                let fileNameToLoad = $(this).text();
                $.ajax({
                    url: 'https://api.github.com/repos/' + repoHistory + '/contents/' + urlDirectory + fileNameToLoad,
                    beforeSend: function(xhr) {
                        xhr.setRequestHeader("Authorization", "Bearer " + gitHubToken);
                        xhr.setRequestHeader("X-GitHub-Api-Version", "2022-11-28");
                    },
                    success: function(data) {
                        $("#" + domIds.mtTextArea).val(atob(data['content']));

                        if (initVars.renderType == "full") {
                            showEditor();
                        }

                        runParse();
                    },
                    error: function(data) {
                        githubAuthProblem(data);
                    }
                });
            });


            $("#" + domIds.mtGithubUploadContainer).removeClass('mt-hidden');
            $("#" + domIds.mtGithubPath).addClass('mt-hidden');
            $("#" + domIds.mtGithubMessages).removeClass('mt-hidden');
            if (urlDirectory != "") {
                $("#" + domIds.mtGithubMessages).text(repoHistory + "/" + urlDirectory);
            } else {
                $("#" + domIds.mtGithubMessages).text(repoHistory);
            }
        }

        function ajaxGetRepoContent() {
            urlDirectory = "";
            for (var i = 0; i < directoryHistory.length; i++) {
                urlDirectory += directoryHistory[i] + "/";
            }

            $.ajax({
                url: 'https://api.github.com/repos/' + repoHistory + '/contents/' + urlDirectory,
                beforeSend: function(xhr) {
                    xhr.setRequestHeader("Authorization", "Bearer " + gitHubToken);
                    xhr.setRequestHeader("X-GitHub-Api-Version", "2022-11-28");
                },
                success: function(data) {
                    actualDirectory = [];

                    for (var i = 0; i < data.length; i++) {
                        actualDirectory.push([data[i]['name'], data[i]['type'], data[i]['sha']]);
                    }
                    htmlInsertDirectories();
                }
            });
        }
        ////////////////////////////////////////////////////////////


        function ajaxSaveText() {
            $.ajax({
                method: 'POST',
                url: initVars.autoSaveUrl,
                dataType: 'json',
                data: {
                    text: oldVal,
                    uid: initVars.uid
                },
                cache: false,
            }).done(function(resp) {

            });
        }

        function insertToStartOfLine(tagToInsert) {
            let startPositionOfLine = getStartOfLine()

            let oldValTemp = oldVal;
            if (oldValTemp.substring(startPositionOfLine, startPositionOfLine + 1) != "#" && tagToInsert == "#") {
                oldValTemp = insertText(oldValTemp, tagToInsert + " ", startPositionOfLine);
            } else {
                oldValTemp = insertText(oldValTemp, tagToInsert, startPositionOfLine);
            }


            $('#' + domIds.mtTextArea).val(oldValTemp);
            runParse();
        }

        function getStartOfLine() {
            let textToReplace2 = oldVal;
            let textByLines = textToReplace2.split(/\n|\r|\n\r/g);

            $('#' + domIds.mtTextArea).focus();
            let selection = $('#' + domIds.mtTextArea).getSelection();

            let insertPosition = 0;
            for (var i = 0; i < textByLines.length; i++) {
                if (selection.start <= insertPosition + textByLines[i].length) {
                    return insertPosition;
                }
                insertPosition += textByLines[i].length;
                insertPosition += 1;
            }
        }

        function insertText(replaceText, insertText, position) {
            return replaceText.substring(0, position) + insertText + replaceText.substring(position);
        }

        function removeCharacterAtPosition(replaceText, position) {
            return replaceText.substring(0, position) + replaceText.substring(position + 1);
        }

        function makeid(length) {
            let result = '';
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
            const charactersLength = characters.length;
            let counter = 0;
            while (counter < length) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
                counter += 1;
            }
            return result;
        }

        var latexWithId = [];

        function analizeLatex(textToFindCode) {
            var regexCode = new RegExp(/\$\$(?<=\$\$)(.*?(?=\$\$))\$\$/gs);
            var execResult = regexCode.exec(textToFindCode);
            if (execResult == null) {
                return textToFindCode;
            }

            var firstPart = textToFindCode.substring(0, execResult['index']);
            var secondPart = textToFindCode.substring(execResult['index'] + execResult[0].length);

            var latexId = null;

            do {
                latexId = makeid(7);
            } while (textToFindCode.includes(latexId));

            textToFindCode = firstPart + latexId + secondPart;

            let latexWithoutMarkup = execResult[0].slice(2);
            latexWithoutMarkup = latexWithoutMarkup.slice(0, -2);
            if (latexWithoutMarkup.charAt(0) === '\n') {
                latexWithoutMarkup = latexWithoutMarkup.slice(1);
            }
            latexWithId.push([latexId, latexWithoutMarkup]);

            return analizeLatex(textToFindCode);
        }

        var textToReplace;
        var inputHistory = [];
        var redoHistory = [];
        var undoParser = false;
        var redoParser = false;

        function runParse() {
            var currentVal = $("#" + domIds.mtTextArea).val();

            if (currentVal == oldVal) {
                return;
            }

            oldVal = currentVal;

            if (undoParser) {} else {
                if (inputHistory.length > 200) {
                    inputHistory.shift();
                }
                inputHistory.push(oldVal);

            }

            if (!redoParser && !undoParser) {
                redoHistory = [];
            }

            redoParser = false;
            undoParser = false;

            textToReplace = oldVal;

            latexWithId = [];
            textToReplace = analizeLatex(textToReplace);

            for (var i = 0; i < latexWithId.length; i++) {
                textToReplace = textToReplace.replace(latexWithId[i][0], "<img id='" + latexWithId[i][0] + "'>");
            }

            textToReplace = marked.parse(textToReplace);
            let clean = textToReplace;

            if (initVars.xssPurify == true) {
                clean = DOMPurify.sanitize(textToReplace, {
                    USE_PROFILES: {
                        html: true
                    }
                }); // Clean for XSS
            }

            $('#' + domIds.mtOutput)[0].innerHTML = clean;

            parseLatex(latexWithId);


            document.querySelectorAll('#' + domIds.mtOutput + ' code').forEach(el => {
                hljs.highlightElement(el);
            });
        }

        function insertDoubleTag(tagToInsert) {
            $('#' + domIds.mtTextArea).focus();
            let selection = $('#' + domIds.mtTextArea).getSelection();

            let oldValTemp = oldVal;
            oldValTemp = insertText(oldValTemp, tagToInsert, selection.end);
            oldValTemp = insertText(oldValTemp, tagToInsert, selection.start);

            $('#' + domIds.mtTextArea).val(oldValTemp);
            runParse();
        }

        function insertCodeTag() {
            $('#' + domIds.mtTextArea).focus();
            let selection = $('#' + domIds.mtTextArea).getSelection();

            let oldValTemp = oldVal;
            oldValTemp = insertText(oldValTemp, "\n```", selection.end);
            oldValTemp = insertText(oldValTemp, "```\n", selection.start);

            $('#' + domIds.mtTextArea).val(oldValTemp);
            runParse();
        }

        function insertSingleTag(tagToInsert) {
            $('#' + domIds.mtTextArea).focus();
            let selection = $('#' + domIds.mtTextArea).getSelection();

            let oldValTemp = oldVal;
            oldValTemp = insertText(oldValTemp, tagToInsert, selection.start);

            $('#' + domIds.mtTextArea).val(oldValTemp);
            runParse();
        }

        function getGithubUser() {
            $.ajax({
                url: 'https://api.github.com/user',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader("Authorization", "Bearer " + gitHubToken);
                    xhr.setRequestHeader("X-GitHub-Api-Version", "2022-11-28");
                },
                success: function(data) {
                    $("#" + domIds.mtGithubMessages).addClass('mt-hidden');
                    $("#" + domIds.mtGithubPath).removeClass('mt-hidden');

                    githubUserName = data.login;

                    if (pushRespositories.length != 0) {
                        htmlInsertRepositories();
                    } else {
                        ajaxGetAvaibleRepos();
                    }
                },
                error: function(data) {
                    githubAuthProblem(data);
                }
            });
        }

        function showEditor() {
            $('#' + domIds.mtGithubContainer).addClass('mt-hidden');
            $('#' + domIds.mtFileContainer).addClass('mt-hidden');

            $('#' + domIds.mtEditorContainer).removeClass('mt-overflow-auto');
            $('#' + domIds.mtTextArea).removeClass('mt-hidden');
        }

        function undoText() {
            if (inputHistory.length > 0) {
                let popValue = inputHistory.pop();
                let actualValue = $("#" + domIds.mtTextArea).val();

                if (actualValue == popValue) {
                    popValue = inputHistory.pop();
                }

                redoHistory.push(actualValue);

                $("#" + domIds.mtTextArea).val(popValue);

                undoParser = true;
                runParse();
            }
        }

        function redoText() {
            if (redoHistory.length > 0) {
                let popValue = redoHistory.pop();
                $("#" + domIds.mtTextArea).val(popValue);

                redoParser = true;
                runParse();
            }
        }




        function keyCheck(event, keyCode) {
            if (event.ctrlKey && event.which === keyCode && $('#' + domIds.mtTextArea).is(":focus")) {
                return true;
            } else {
                return false;
            }
        }

        $(document).keydown(function(event) {
            if (keyCheck(event, 66)) {
                insertDoubleTag("**");
            } else if (keyCheck(event, 73)) {
                insertDoubleTag("*");
            } else if (keyCheck(event, 77)) {
                insertCodeTag();
            }
        });
        $('#' + domIds.mtBtnHeading).click(function() {
            insertToStartOfLine("#");
        });
        $('#' + domIds.mtBtnBold).click(function() {
            insertDoubleTag("**");
        });
        $('#' + domIds.mtBtnItalic).click(function() {
            insertDoubleTag("*");
        });
        $('#' + domIds.mtBtnStrike).click(function() {
            insertDoubleTag("~~");
        });
        $('#' + domIds.mtBtnQuote).click(function() {
            insertToStartOfLine(">");
        });
        $('#' + domIds.mtBtnLink).click(function() {
            insertSingleTag("[]()");
        });
        $('#' + domIds.mtBtnCode).click(function() {
            insertDoubleTag("`");
        });
        $('#' + domIds.mtBtnCodeBlock).click(function() {
            insertCodeTag();
        });
        $('#' + domIds.mtBtnLatex).click(function() {
            insertDoubleTag("$$");
        });
        $('#' + domIds.mtBtnDownlod).click(function() {
            saveTextAsFile(oldVal, 'markdown.md');
        });

        if (initVars.renderType == "full") {
            $('#' + domIds.mtBtnUpload).click(function() {
                $('#' + domIds.mtTextArea).addClass('mt-hidden');
                $('#' + domIds.mtGithubContainer).addClass('mt-hidden');

                $('#' + domIds.mtEditorContainer).addClass('mt-overflow-auto');
                $('#' + domIds.mtFileContainer).removeClass('mt-hidden');
            });

            $('#' + domIds.mtBtnGithub).click(function() {
                $('#' + domIds.mtTextArea).addClass('mt-hidden');
                $('#' + domIds.mtFileContainer).addClass('mt-hidden');

                $('#' + domIds.mtEditorContainer).addClass('mt-overflow-auto');
                $('#' + domIds.mtGithubContainer).removeClass('mt-hidden');
            });

            $('#' + domIds.mtBtnEditor).click(function() {
                showEditor();
            });
        }

        $('#' + domIds.mtBtnUndo).click(function() {
            undoText();
        });
        $('#' + domIds.mtBtnRedo).click(function() {
            redoText();
        });

        $("#" + domIds.mtTextArea).on("change keyup paste", function() {
            runParse();
        });
        if (initVars.gitHubToken != null) {
            $('#' + domIds.mtGithubInputToken).val(gitHubToken);
            getGithubUser();
        }
        $('#' + domIds.mtBtnSetToken).click(function() {
            gitHubToken = $('#' + domIds.mtGithubInputToken).val();
            if (initVars.tokenSaveUrl != null) {
                $.ajax({
                    method: 'POST',
                    url: initVars.tokenSaveUrl,
                    dataType: 'json',
                    data: {
                        token: gitHubToken,
                        uid: initVars.uid
                    },
                    cache: false,
                }).done(function(resp) {

                });
            }
            getGithubUser();
        });
        $('#' + domIds.mtBtnUploadGithub).click(function() {
            let fileName = $("#" + domIds.mtInputFileName).val();

            let commitText = $("#" + domIds.mtInputCommit).val();
            let fileContent = btoa(oldVal);

            let dataSend = JSON.stringify({
                message: commitText,
                content: fileContent,
            });

            for (var i = 0; i < actualDirectory.length; i++) {
                if (actualDirectory[i][0] == fileName) {
                    dataSend = JSON.stringify({
                        message: commitText,
                        content: fileContent,
                        sha: actualDirectory[i][2],
                    });
                    break;
                }
            }

            $.ajax({
                url: 'https://api.github.com/repos/marek5816/zadanie-1/contents/' + fileName,
                type: 'PUT',
                data: dataSend,
                beforeSend: function(xhr) {
                    xhr.setRequestHeader("Authorization", "Bearer " + gitHubToken);
                    xhr.setRequestHeader("X-GitHub-Api-Version", "2022-11-28");
                },
                success: function(data) {
                    $("#" + domIds.mtInputFileName).val("");
                    $("#" + domIds.mtInputCommit).val("");
                    ajaxGetRepoContent();
                },
                error: function(data) {
                    $("#" + domIds.mtInputFileName).val("");
                    $("#" + domIds.mtInputCommit).val("");
                    ajaxGetRepoContent();
                    githubAuthProblem();
                }
            });
        });
        document.getElementById(domIds.mtFileUpload).addEventListener('change', handleFileSelect, false);
        if (initVars.autoSaveInterval != null) {
            const autosaveInterval = setInterval(ajaxSaveText, initVars.autoSaveInterval * 1000);
        }
        $("#" + domIds.mtTextArea).val(initVars.initText);
        runParse();
    })(initVars);
}