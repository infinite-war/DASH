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
 * @class
 * @ignore
 */
class QoeInfo {

    constructor() {
        // Type e.g. 'segment'
        this.type = null;

        // Store lastBitrate for calculation of bitrateSwitchWSum
        // 计算比特率切换的加权和的最后一个比特率
        this.lastBitrate = null;

        // Weights for each Qoe factor
        // 每个 QoE 因素的权重
        this.weights = {};
        this.weights.bitrateReward = null; // 比特率奖励权重
        this.weights.bitrateSwitchPenalty = null; // 比特率切换惩罚权重
        this.weights.rebufferPenalty = null; // 重新缓冲惩罚权重
        this.weights.latencyPenalty = null; // 延迟惩罚权重
        this.weights.playbackSpeedPenalty = null; // 播放速度惩罚权重

        // Weighted Sum for each Qoe factor
        this.bitrateWSum = 0;// kbps   比特率的加权和
        this.bitrateSwitchWSum = 0;// kbps   比特率切换的加权和
        this.rebufferWSum = 0;// seconds   重新缓冲的加权和
        this.latencyWSum = 0;// seconds   延迟的加权和
        this.playbackSpeedWSum = 0;// e.g. 0.95, 1.0, 1.05   播放速度的加权和

        // Store total Qoe value based on current Weighted Sum values
        // 根据当前加权和值计算出的总体 QoE 值
        this.totalQoe = 0;
    }
}

export default QoeInfo;
