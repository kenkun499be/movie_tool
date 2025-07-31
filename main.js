// main.js

const videoInput = document.getElementById("videoInput");
const processBtn = document.getElementById("processBtn");
const progressContainer = document.getElementById("progress-container");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const downloads = document.getElementById("downloads");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const hiddenVideo = document.getElementById("hiddenVideo");
const loopToggle = document.getElementById("loopToggle");
const titleInput = document.getElementById("titleInput");

let videoDuration = 0;
let frameRate = 10; // fps
let frames = [];
let frameWidth = 854;
let frameHeight = 480;

function sanitizeFileName(name) {
  // ファイル名に使えない文字を除去
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim().substring(0, 50) || "pack";
}

function generateUUID() {
  // UUID v4生成
  // https://stackoverflow.com/questions/105034/how-to-create-guid-uuid
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// server_form.jsonの固定内容
const serverFormJSON = `{
    "namespace": "server_form",
    "$schema": "https://kalmemarq.github.io/Bugrock-JSON-UI-Schemas/ui.schema.json",

    "long_form": {
        "type": "panel",
        "size": [1920, 1080],
        "controls": [
            {
                "default_long_form@common_dialogs.main_panel_no_buttons": {
                    "$title_panel": "common_dialogs.standard_title_label",
                    "$title_size": ["100% - 14px", 10],
                    "size": [1920, 1080],
                    "$text_name": "#title_text",
                    "$title_text_binding_type": "none",
                    "$child_control": "server_form.long_form_panel",
                    "layer": 2,
                    "bindings": [
                        {
                            "binding_name": "#title_text"
                        },
                        {
                            "binding_type": "view",
                            "source_property_name": "((#title_text - 'Custom Form') = #title_text)",
                            "target_property_name": "#visible"
                        }
                    ]
                }
            },
            {
                "custom_long_form": {
                    "type": "panel",
                    "size": [500, 300],
                    "layer": 2,
                    "controls": [
                        {
                            "indent_panel": {
                                "type": "panel",
                                "size": ["100% - 16px", "100%"],
                                "controls": [
                                    {
                                        "my_form_label@server_form.my_form_label": {}
                                    },
                                    {
                                        "my_close_button@server_form.my_close_button": {
                                            "offset": [8, -8],
                                            "layer": 64
                                        }
                                    },
                                    {
                                        "my_form_background@server_form.my_form_background": {}
                                    },

                                    {
                                        "content_stack": {
                                            "type": "stack_panel",
                                            "size": ["100%", "100%"],
                                            "orientation": "vertical",
                                            "controls": [
                                                {
                                                    "padding": {
                                                        "type": "panel",
                                                        "size": ["100%", "100%"]
                                                    }
                                                },
                                                {
                                                    "my_form_body@server_form.my_form_body": {}
                                                },
                                                {
                                                    "button_panel@server_form.my_super_custom_panel_main": {}
                                                }
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    ],
                    "bindings": [
                        {
                            "binding_name": "#title_text"
                        },
                        {
                            "binding_type": "view",
                            "source_property_name": "(#title_text = 'Custom Form')",
                            "target_property_name": "#visible"
                        }
                    ]
                }
            }
        ]
    },

    

    "my_form_body": {
        "type": "panel",
        "anchor_from": "top_middle",
        "size": [1920, 1080],
        "layer": 8,
        "controls": [
            {
                "form_body_text": {
                    "type": "label",
                    "text": "#form_text",
                    "layer": 8,
                    "bindings": [
                        {
                            "binding_name": "#form_text"
                        }
                    ]
                }
            },
            {
                "my_form_background@server_form.image_uv_animation": {
                    "size": ["100% - 22px", "100%"]
                }
            }
        ]
    },

    


    "my_form_background": {
    "type": "image",
    "size": ["100% + 5px", "100% + 5px"],
    "texture": "textures/ui/movie",
    "uv_size": [854, 480],
    "alpha": 1,
    "uv": "@server_form.image_uv_animation"
  },

  "image_uv_animation": {
    "anim_type": "aseprite_flip_book",
    "initial_uv": [0, 0]
  }
}
`;

function createManifestJSON(packName) {
  const uuid1 = generateUUID();
  const uuid2 = generateUUID();

  return JSON.stringify({
    format_version: 2,
    header: {
      name: packName,
      description: "マイクラで動画を再生する",
      min_engine_version: [1, 19, 60],
      uuid: uuid1,
      version: [0, 0, 1],
    },
    modules: [
      {
        type: "resources",
        uuid: uuid2,
        version: [0, 0, 1],
      },
    ],
    dependencies: [
      {
        uuid: "440ac16a-a636-41da-89a4-64edbb06f4f1",
        version: [0, 0, 1],
      },
    ],
  }, null, 4);
}

// JSON生成（movie.json）
function createMovieJSON(frameCount, loopEnabled) {
  // ループONの場合は今まで通り（再生時間はフレーム数/fps）
  // ループOFFの場合は最後のフレームを黒くし、再生時間を1時間相当に延長
  // frameWidth=854, frameHeight=480

  const framesArr = [];

  for (let i = 0; i < frameCount; i++) {
    framesArr.push({
      uv: [i * frameWidth, 0],
      size: [frameWidth, frameHeight],
      duration: 1 / frameRate,
    });
  }

  if (!loopEnabled) {
    // 最後のフレームを黒（UV位置は同じなので別途黒画像ではなくキャンバスで黒塗りして作成）
    // ここではmovie.pngの最後の1フレーム分を黒で上書きし、それをframesArrに反映する必要があるため
    // 実際の処理はmain処理で実施

    // 再生時間を約1時間（3600秒）に延長
    framesArr[framesArr.length - 1].duration = 3600;
  }

  return {
    anim_type: "aseprite_flip_book",
    frame_size: [frameWidth, frameHeight],
    loop: loopEnabled,
    frames: framesArr,
  };
}

// 動画処理＆zip作成の本体
processBtn.addEventListener("click", async () => {
  downloads.innerHTML = "";
  const file = videoInput.files[0];
  if (!file) {
    alert("動画ファイルを選択してください");
    return;
  }
  let packNameRaw = titleInput.value.trim();
  let packName = sanitizeFileName(packNameRaw);
  if (!packName) packName = "pack";

  const loopEnabled = loopToggle.checked;

  processBtn.disabled = true;
  progressContainer.style.display = "block";
  progressBar.value = 0;
  progressText.textContent = "動画読み込み中…";

  // 動画セット
  hiddenVideo.src = URL.createObjectURL(file);
  hiddenVideo.crossOrigin = "anonymous";

  await new Promise((resolve) => {
    hiddenVideo.onloadedmetadata = () => {
      resolve();
    };
  });

  videoDuration = hiddenVideo.duration;
  const durationForProcessing = loopEnabled ? videoDuration : Math.min(videoDuration, 1); // ループOFFは1秒で止める代わりに後で黒フレーム延長
  const totalFrames = Math.floor(durationForProcessing * frameRate);

  // canvas準備
  canvas.width = frameWidth * totalFrames;
  canvas.height = frameHeight;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  progressText.textContent = "フレーム抽出中…";

  frames.length = 0;

  // フレーム毎に描画
  for (let i = 0; i < totalFrames; i++) {
    hiddenVideo.currentTime = i / frameRate;
    await new Promise((resolve) => {
      hiddenVideo.onseeked = () => {
        // 1フレーム分をcanvasに横並びで描画
        ctx.drawImage(hiddenVideo, frameWidth * i, 0, frameWidth, frameHeight);
        progressBar.value = Math.floor(((i + 1) / totalFrames) * 100);
        progressText.textContent = `フレーム抽出中… (${i + 1}/${totalFrames})`;
        resolve();
      };
    });
  }

  if (!loopEnabled) {
    // 最後のフレーム部分を黒で塗りつぶし
    ctx.fillStyle = "#000";
    ctx.fillRect(frameWidth * (totalFrames - 1), 0, frameWidth, frameHeight);
  }

  // PNG生成
  progressText.textContent = "PNG生成中…";
  const pngBlob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );

  // JSON生成
  progressText.textContent = "JSON生成中…";
  const movieJSONObj = createMovieJSON(totalFrames, loopEnabled);
  const movieJSONText = JSON.stringify(movieJSONObj, null, 2);

  // manifest.json生成
  const manifestJSONText = createManifestJSON(packName);

  // zip作成
  progressText.textContent = "ZIPファイル作成中…";
  const zip = new JSZip();

  // フォルダ構成に従って追加
  // movie/textures/ui/movie.png
  zip.folder("movie")
    .folder("textures")
    .folder("ui")
    .file("movie.png", pngBlob);

  // movie/textures/ui/movie.json
  zip.folder("movie")
    .folder("textures")
    .folder("ui")
    .file("movie.json", movieJSONText);

  // movie/ui/server_form.json
  zip.folder("movie")
    .folder("ui")
    .file("server_form.json", serverFormJSON);

  // manifest.json は movie直下に入れたいが、マイクラリソースパックはルート直下に置くのが一般的なのでルート直下
  zip.file("manifest.json", manifestJSONText);

  // zip生成してダウンロード
  const zipBlob = await zip.generateAsync({ type: "blob" });

  const zipName = `${packName}.mcpack`;

  const a = document.createElement("a");
  a.href = URL.createObjectURL(zipBlob);
  a.download = zipName;
  a.textContent = `ダウンロード: ${zipName}`;
  downloads.appendChild(a);

  progressText.textContent = "処理完了";
  processBtn.disabled = false;
});
