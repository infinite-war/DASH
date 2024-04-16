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
 * @class  媒体段(MPD的一部分)
 * @ignore
 */
class Segment {
    constructor() {
        this.indexRange = null;
        // The index of the segment in the list of segments. We start at 0
        this.index = null;
        this.mediaRange = null;
        this.media = null;
        this.duration = NaN;
        // this is the time that should be inserted into the media url
        // 应该插入媒体 URL 中的时间
        this.replacementTime = null;
        // this is the number that should be inserted into the media url
        // 应该插入媒体 URL 中的编号
        this.replacementNumber = NaN;
        // This is supposed to match the time encoded in the media Segment
        this.mediaStartTime = NaN;
        // When the source buffer timeOffset is set to MSETimeOffset this is the
        // time that will match the seekTarget and video.currentTime
        // 当源缓冲区 timeOffset 设置为 MSETimeOffset 时，
        // 该时间将与seekTarget、video.currentTime 匹配
        this.presentationStartTime = NaN;
        // Do not schedule this segment until
        // 该段的可用开始时间，即在此时间之前不应安排此段
        this.availabilityStartTime = NaN;
        // Ignore and  discard this segment after
        // 该段的可用结束时间，即在此时间之后应忽略和丢弃此段
        this.availabilityEndTime = NaN;
        // For dynamic mpd's, this is the wall clock time that the video
        // element currentTime should be presentationStartTime
        // 对于动态 mpd，这是视频元素 currentTime 应为presentationStartTime 的挂钟时间
        this.wallStartTime = NaN;
        this.representation = null;
    }
}

export default Segment;
