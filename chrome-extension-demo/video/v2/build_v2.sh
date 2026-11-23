#!/bin/bash
# v2 成片：1920x1080，剪紙動畫(12fps 停格)＋實機錄影＋英語旁白＋中英字幕＋配樂
set -e; cd "$(dirname "$0")"
RAW=$(ls ../raw/*.webm | head -1); V01=$(ls v01raw/*.webm | head -1); UNDO=$(ls undoraw/*.webm | head -1); FR=../paper/frames2
mkdir -p seg; rm -f seg/*
ENC="-c:v libx264 -pix_fmt yuv420p -r 30 -preset veryfast -crf 20 -an"
anim(){ ffmpeg -v error -y -framerate 12 -i $FR/$1/%04d.png -vf "fps=30,scale=1920:1080" -t $3 $ENC seg/$2.mp4; }
real(){ ffmpeg -v error -y -i $1 -ss $2 -t $3 -vf "scale=1920:1080:flags=lanczos,fps=30" $ENC seg/$4.mp4; }
anim hook 01 6
anim concept 02 11.94
# v0.1：流程線＋實際畫面（去掉頁首）
ffmpeg -v error -y -framerate 12 -i $FR/flow/%04d.png -i $V01 -filter_complex \
"[0:v]fps=30,scale=1920:1080[bg];[1:v]trim=6:15.2,setpts=PTS-STARTPTS,crop=1280:744:0:62,scale=1360:790,setsar=1,fps=30[a];[1:v]trim=58.3:59.3,setpts=PTS-STARTPTS,crop=1280:600:0:62,scale=1360:638,setsar=1,fps=30,tpad=stop_mode=clone:stop_duration=6.5,pad=1360:790:0:76:color=0x3a332d[b];[a][b]concat=n=2:v=1[clip];[clip]null[c];[bg][c]overlay=520:104:shortest=0" -t 16.43 $ENC seg/03.mp4
anim bridge 04 5.04
real $RAW 11.5 7.51 05
anim feat5 06 9.56
anim scripted 07 13.53
real $RAW 18.0 9.03 08
ffmpeg -v error -y -sseof -0.1 -i seg/08.mp4 -frames:v 1 seg/click.png
ffmpeg -v error -y -loop 1 -i seg/click.png -t 3.0 -vf "fps=30,format=yuv420p" $ENC seg/09.mp4
real $RAW 27.03 9.57 10
real $RAW 43.5 7.29 11
real $UNDO 2.0 5.5 12
anim control 13 4.48
anim next 14 5.0
anim disc2 15 4.03
anim end2 16 12.0
ls seg/*.mp4 | sed "s#seg/##;s/^/file '/;s/$/'/" > seg/list.txt
ffmpeg -v error -y -f concat -safe 0 -i seg/list.txt -c copy seg/silent.mp4
ffmpeg -v error -y -i seg/silent.mp4 -i mix.wav -vf "ass=subs.ass" -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart ../../NeuroAdaptive_demo_v2.mp4
ffprobe -v error -show_entries format=duration,size -of default=nw=1 ../../NeuroAdaptive_demo_v2.mp4
