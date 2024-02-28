import * as vscode from 'vscode';
import * as UnityYamlParser from 'unity-yaml-parser';

export function init(context: vscode.ExtensionContext) {
    vscode.workspace.onDidOpenTextDocument((document: vscode.TextDocument) => {
        const fileName = document.fileName;
        if (fileName.endsWith(".prefab") || fileName.endsWith(".unity")) {
            vscode.window.showInformationMessage(`Open prefab, unity! Want to show this file with asset viewer?`, 'YES').then((selection) => {
                if (selection === 'YES') {
                    UnityAssetViewer.show(context, fileName);
                }

            });
        }
    });
}

class UnityAssetViewer {
    public static readonly viewType = 'unityAssetViewer';

    public static show(context: vscode.ExtensionContext, path: string) {
        const extensionUri = context.extensionUri;
        const panel = vscode.window.createWebviewPanel(
            this.viewType,
            'Unity Asset Viewer',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        const fontUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'clover-icon.woff'))
        const hierarchyCss = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'hierarchy.css'))
        panel.webview.html = this.getHtmlForWebview(path, fontUri, hierarchyCss);
    }

    private static hierarchyBase(fileId: string, name: string) {
        return `
        <li>
            <div class="hierachy-object"><span class="icon">&#xe900;</span>${name}</div>
            <ul id="${fileId}">
            </ul>
        </li>
        `;
    }

    private static getHtmlForWebview(path: string, fontUri: vscode.Uri, hierachyCss: vscode.Uri) {
        var datas = UnityYamlParser.parse(path);
        var gameObjects = datas.filter((item) => item.classId == "1");
        var transforms = datas.filter((item) => item.classId == "4" || item.classId == "224");

        var test = gameObjects.map((item) => {
            return this.hierarchyBase(item.fileId, item.data.GameObject.m_Name);
        });

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">

                <link href="${fontUri}" rel="stylesheet">
                <link href="${hierachyCss}" rel="stylesheet">

                <style>
                    @font-face {
                        font-family: 'clover-icon';
                        src: url('${fontUri}') format('woff');
                    }

                    div {
                        width: 100%;
                        height: 100%;
                    }

                    div.left {
                        width: 50%;
                        float: left;
		                overflow-y: auto;
                    }

                    div.right {
                        width: 50%;
                        float: right;
                        overflow-y: auto;
                    }

                    .icon {
                        font-family: 'clover-icon';
                    }
                </style>
			</head>
			<body>
				<div>
                    <div class="left">
                        <h2>Hierachy</h1>
                        <ul id="hierachy">
                        <li>
                            ${test.join('')}
                        </li>
                    </div>
                    <div class="right">
                        <h2>Inspector</h1>
                    </div>
				</div>
                <script>
    // TypeScript에서 선언한 transforms를 전역 변수로 설정
    const transforms = ${JSON.stringify(transforms)};
    const hierarchy = document.getElementById('hierarchy');
    
    // updateHierarchy 함수를 정의
    function updateHierarchy() {
        // hierarchy를 업데이트하기 위한 코드
        transforms.forEach(transform => {

            console.log(transform);

            let fatherId;
            let gameObjectId;
            if (transform.classId == "4")
            {
                const gameObjectId = transform.data.Transform.m_GameObject?.fileId ?? -1;
                fatherId = transform.data.Transform.m_Father?.fileId ?? -1;
            }
            else
            {
                const gameObjectId = transform.data.RectTransform.m_GameObject?.fileId ?? -1;
                fatherId = transform.data.RectTransform.m_Father?.fileId ?? -1;
            }

            if (fatherId == -1 || gameObjectId == -1) return;

            // 해당 gameObjectId를 가진 요소를 찾기
            const gameObjectElement = document.getElementById(gameObjectId);
            
            if (gameObjectElement) {
                // 만약 해당 gameObjectId를 가진 요소가 존재한다면,
                // 해당 요소를 다른 위치로 이동시킴 (부모 노드 바꾸기)
                const fatherElement = document.getElementById(fatherId);
                if (fatherElement) {
                    fatherElement.appendChild(gameObjectElement);
                } else {
                    // 만약 fatherId에 해당하는 요소가 존재하지 않는다면, root로 이동시킴
                    hierarchy.appendChild(gameObjectElement);
                }
            }
        });
    }
    
    updateHierarchy(); // updateHierarchy 함수 호출
</script>
			</body>
			</html>`;
    }
}