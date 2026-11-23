#!/bin/bash
# 合成最終影片：剪紙動畫 + 實機錄影 + 紙片字幕
set -e
cd "$(dirname "$0")"
RAW=$(ls raw/*.webm | head -1); C=paper/caps; mkdir -p seg; rm -f seg/*
ENC="-c:v libx264 -pix_fmt yuv420p -r 30 -preset veryfast -crf 20 -an"
anim(){ ffmpeg -v error -y -framerate 12 -i paper/frames/$1/%04d.png -vf "fps=30,scale=1280:720" $ENC seg/$2.mp4; }
# real <name> <start> <dur> <cap1> [t1 cap2 t2 cap3 ...]
real(){ n=$1; ss=$2; du=$3; shift 3; ins="-ss $ss -t $du -i $RAW"; fc="[0:v]scale=1280:720,fps=30[v0]"; i=1; last=v0
  while [ $# -gt 0 ]; do cap=$1; a=$2; b=$3; shift 3; ins="$ins -i $C/$cap.png"; fc="$fc;[$last][$i:v]overlay=0:0:enable='between(t,$a,$b)'[v$i]"; last=v$i; i=$((i+1)); done
  ffmpeg -v error -y $ins -filter_complex "$fc" -map "[$last]" $ENC seg/$n.mp4; }
anim hook 01; anim concept 02
real 03 3.5 7 c_real 0 2.2 c_noisy 2.2 7
real 04 12.0 9 c_detect 0.3 9
real 05 21.5 5.5 c_prompt 0.3 5.5
real 06 27.0 5.5 c_l1 0.1 1.2 c_l2 1.2 2.3 c_l3 2.3 3.4 c_l4 3.4 5.5
real 07 34.0 5.5 c_ruler 0.2 5.5
real 08 43.5 6.5 c_chunk 0.2 6.5
real 09 55.0 4 c_calm 0.2 4
# 分割對比：左＝開啟前（同一頁、亂動中），右＝專注模式（平穩）
ffmpeg -v error -y -loop 1 -t 8 -i paper/frames/splitbg/0000.png -ss 14 -t 8 -i $RAW -ss 51 -t 8 -i $RAW -i $C/lab_before.png -i $C/lab_after.png -i $C/c_split.png -filter_complex \
"[1:v]scale=600:338,fps=30[l];[2:v]scale=600:338,fps=30[r];[0:v]fps=30[b];[b][l]overlay=34:108[a];[a][r]overlay=646:108[c];[c][3:v]overlay=60:470[d];[d][4:v]overlay=680:470[e];[e][5:v]overlay=0:0" $ENC -t 8 seg/10.mp4
anim features 11; anim disclaimer 12; anim end 13
ls seg/*.mp4 | sed "s/^/file '/;s/$/'/" | sed "s#file 'seg/#file '#" > seg/list.txt
ffmpeg -v error -y -f concat -safe 0 -i seg/list.txt -c copy seg/silent.mp4
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 seg/silent.mp4)
# 聲音反差：點下「開啟」前疊低音量環境雜訊，點下後只剩一聲輕響，然後安靜
CLICK=$(python3 -c "print(6+10+7+9+5.5)")
ffmpeg -v error -y -f lavfi -i "anoisesrc=c=pink:a=0.05:d=$CLICK" -f lavfi -i "sine=f=880:d=0.6" -filter_complex \
"[0:a]afade=t=in:st=0:d=2,afade=t=out:st=$(python3 -c "print($CLICK-0.3)"):d=0.3,adelay=0|0[n];[1:a]volume=0.25,afade=t=out:st=0.05:d=0.55,adelay=$(python3 -c "print(int($CLICK*1000))")|$(python3 -c "print(int($CLICK*1000))")[c];[n][c]amix=inputs=2:normalize=0,apad,atrim=0:$D[a]" -map "[a]" -c:a aac -b:a 128k seg/audio.m4a
ffmpeg -v error -y -i seg/silent.mp4 -i seg/audio.m4a -c:v copy -c:a aac -shortest -movflags +faststart ../NeuroAdaptive_demo.mp4
ffprobe -v error -show_entries format=duration,size -of default=nw=1 ../NeuroAdaptive_demo.mp4
