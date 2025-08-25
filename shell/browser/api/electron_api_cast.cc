// Copyright (c) 2024 GitHub, Inc.
// Use of this source code is governed by the MIT license that can be
// found in the LICENSE file.

#include "shell/browser/api/electron_api_cast.h"

#include <utility>
#include <ctime>

#include "base/logging.h"
#include "base/values.h"
#include "gin/arguments.h"
#include "gin/converter.h"
#include "gin/dictionary.h"
#include "gin/object_template_builder.h"
#include "shell/common/gin_converters/callback_converter.h"
#include "shell/common/gin_converters/value_converter.h"
#include "shell/common/gin_helper/dictionary.h"
#include "shell/common/node_includes.h"
#include "content/public/browser/browser_thread.h"

namespace electron::api {

gin::WrapperInfo Cast::kWrapperInfo = {gin::kEmbedderNativeGin};

// static
gin::Handle<Cast> Cast::Create(v8::Isolate* isolate) {
  return gin::CreateHandle(isolate, new Cast(isolate));
}

Cast::Cast(v8::Isolate* isolate) {
  InitWithIsolate(isolate);
}

Cast::~Cast() = default;

gin::ObjectTemplateBuilder Cast::GetObjectTemplateBuilder(
    v8::Isolate* isolate) {
  return gin::Wrappable<Cast>::GetObjectTemplateBuilder(isolate)
      .SetMethod("startDiscovery", &Cast::StartDiscovery)
      .SetMethod("stopDiscovery", &Cast::StopDiscovery)
      .SetMethod("getDevices", &Cast::GetDevices)
      .SetMethod("castMedia", &Cast::CastMedia)
      .SetMethod("stopCasting", &Cast::StopCasting);
}

const char* Cast::GetTypeName() {
  return "Cast";
}

void Cast::StartDiscovery(gin::Arguments* args) {
  if (discovery_active_) {
    args->ThrowError("Cast discovery is already active");
    return;
  }

  discovery_active_ = true;
  discovered_devices_.clear();

  // For now, simulate device discovery with a mock Chromecast device
  // In a real implementation, this would integrate with Chromium's
  // media router or mDNS service discovery
  base::Value::Dict device_info;
  device_info.Set("id", "mock_chromecast_001");
  device_info.Set("name", "Living Room Chromecast");
  device_info.Set("type", "chromecast");
  device_info.Set("status", "available");
  
  discovered_devices_.push_back(base::Value(std::move(device_info)));
  
  // Emit device discovered event
  OnDeviceDiscovered("mock_chromecast_001", "Living Room Chromecast", "chromecast");
}

void Cast::StopDiscovery() {
  discovery_active_ = false;
  discovered_devices_.clear();
}

std::vector<base::Value> Cast::GetDevices() {
  return discovered_devices_;
}

void Cast::CastMedia(const std::string& device_id,
                     const std::string& media_url,
                     gin::Arguments* args) {
  if (device_id.empty() || media_url.empty()) {
    args->ThrowError("Device ID and media URL are required");
    return;
  }

  // For now, simulate successful cast session creation
  std::string session_id = "cast_session_" + device_id + "_" + std::to_string(time(nullptr));
  
  LOG(INFO) << "Starting cast session " << session_id 
            << " to device " << device_id 
            << " with media URL " << media_url;
  
  OnCastSessionStarted(session_id, device_id);
}

void Cast::StopCasting(const std::string& session_id) {
  if (session_id.empty()) {
    return;
  }

  LOG(INFO) << "Stopping cast session " << session_id;
  OnCastSessionEnded(session_id);
}

void Cast::OnDeviceDiscovered(const std::string& device_id,
                              const std::string& device_name,
                              const std::string& device_type) {
  base::Value::Dict event_data;
  event_data.Set("deviceId", device_id);
  event_data.Set("deviceName", device_name);
  event_data.Set("deviceType", device_type);
  
  EmitWithoutWarnWithEvent("device-discovered", base::Value(std::move(event_data)));
}

void Cast::OnDeviceLost(const std::string& device_id) {
  base::Value::Dict event_data;
  event_data.Set("deviceId", device_id);
  
  EmitWithoutWarnWithEvent("device-lost", base::Value(std::move(event_data)));
}

void Cast::OnCastSessionStarted(const std::string& session_id,
                                const std::string& device_id) {
  base::Value::Dict event_data;
  event_data.Set("sessionId", session_id);
  event_data.Set("deviceId", device_id);
  
  EmitWithoutWarnWithEvent("session-started", base::Value(std::move(event_data)));
}

void Cast::OnCastSessionEnded(const std::string& session_id) {
  base::Value::Dict event_data;
  event_data.Set("sessionId", session_id);
  
  EmitWithoutWarnWithEvent("session-ended", base::Value(std::move(event_data)));
}

void Cast::OnCastError(const std::string& error_message) {
  base::Value::Dict event_data;
  event_data.Set("message", error_message);
  
  EmitWithoutWarnWithEvent("error", base::Value(std::move(event_data)));
}

}  // namespace electron::api

namespace {

using electron::api::Cast;

void Initialize(v8::Local<v8::Object> exports,
                v8::Local<v8::Value> unused,
                v8::Local<v8::Context> context,
                void* priv) {
  v8::Isolate* isolate = context->GetIsolate();
  gin_helper::Dictionary dict(isolate, exports);
  dict.Set("Cast", Cast::GetConstructor(isolate)->GetFunction(context).ToLocalChecked());
}

}  // namespace

NODE_LINKED_BINDING_CONTEXT_AWARE(electron_browser_cast, Initialize)