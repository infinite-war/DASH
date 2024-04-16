/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @class MPD结构下的Representation层
 * @ignore
 */

import DashConstants from '../constants/DashConstants';

class Representation {
    constructor() {
        this.id = null;
        this.index = -1;
        this.adaptation = null;             // 该表示形式所属的适配集合（AdaptationSet），通常是一个对象的引用
        this.segmentInfoType = null;
        this.initialization = null;
        this.codecs = null;                 // 使用的编解码器
        this.mimeType = null;               // 媒体类型
        this.codecPrivateData = null;       // 该表示形式的编解码器私有数据
        this.segmentDuration = NaN;         
        this.timescale = 1;                 // 时间标度/单位
        this.startNumber = 1;               // 段序列的起始编号
        this.indexRange = null;
        this.range = null;
        this.presentationTimeOffset = 0;
        // Set the source buffer timeOffset to this
        this.MSETimeOffset = NaN;           // 媒体缓冲器（Media Source Extensions）的时间偏移
        // The information we need in the DashHandler to determine whether the last segment has been loaded
        // 媒体完成信息，包括段数和最后一个已加载段的媒体时间
        this.mediaFinishedInformation = { numberOfSegments: 0, mediaTimeOfLastSignaledSegment: NaN };  
        this.bandwidth = NaN;               // 该表示形式的带宽
        this.width = NaN;
        this.height = NaN;
        this.scanType = null;
        this.maxPlayoutRate = NaN;          // 最大播放速率
        this.availabilityTimeOffset = 0;    // 可用时间的偏移量
        this.availabilityTimeComplete = true; // 可用时间是否完整
        this.frameRate = null;              // 视频的帧率
    }

    hasInitialization() {
        return (this.initialization !== null || this.range !== null);
    }

    hasSegments() {
        return this.segmentInfoType !== DashConstants.BASE_URL &&
            this.segmentInfoType !== DashConstants.SEGMENT_BASE &&
            !this.indexRange;
    }
}

export default Representation;
