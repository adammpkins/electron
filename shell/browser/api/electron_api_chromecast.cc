// Copyright (c) 2024 GitHub, Inc.
// Use of this source code is governed by the MIT license that can be
// found in the LICENSE file.

#include "shell/browser/api/electron_api_chromecast.h"

#include "base/functional/bind.h"
#include "base/logging.h"
#include "gin/data_object_builder.h"
#include "shell/browser/javascript_environment.h"
#include "shell/common/gin_converters/callback_converter.h"
#include "shell/common/gin_helper/dictionary.h"
#include "shell/common/gin_helper/handle.h"
#include "shell/common/gin_helper/object_template_builder.h"
#include "shell/common/gin_helper/promise.h"
#include "shell/common/node_includes.h"

namespace electron::api {

gin::WrapperInfo Chromecast::kWrapperInfo = {gin::kEmbedderNativeGin};

Chromecast::Chromecast(v8::Isolate* isolate)
    : isolate_(isolate) {
}

Chromecast::~Chromecast() = default;

gin_helper::Handle<Chromecast> Chromecast::Create(v8::Isolate* isolate) {
  return gin_helper::CreateHandle(isolate, new Chromecast(isolate));
}

void Chromecast::StartDiscovery() {
  if (discovering_) {
    return;
  }
  
  discovering_ = true;
  
  // For now, simulate discovery of a test device
  // In a real implementation, this would start mDNS discovery
  ChromecastDevice test_device;
  test_device.id = "test_chromecast_001";
  test_device.name = "Living Room TV";
  test_device.host = "192.168.1.100";
  test_device.port = 8009;
  test_device.type = "Chromecast";
  
  // Add the test device after a short delay to simulate discovery
  base::SequencedTaskRunner::GetCurrentDefault()->PostDelayedTask(
      FROM_HERE,
      base::BindOnce(&Chromecast::AddDevice, 
                     weak_factory_.GetWeakPtr(), test_device),
      base::Milliseconds(500));
}

void Chromecast::StopDiscovery() {
  if (!discovering_) {
    return;
  }
  
  discovering_ = false;
  
  // Clear all discovered devices
  devices_.clear();
}

std::vector<gin_helper::Dictionary> Chromecast::GetDevices(v8::Isolate* isolate) {
  std::vector<gin_helper::Dictionary> result;
  
  for (const auto& [id, device] : devices_) {
    gin_helper::Dictionary device_dict = gin::DataObjectBuilder(isolate)
        .Set("id", device.id)
        .Set("name", device.name)
        .Set("host", device.host)
        .Set("port", device.port)
        .Set("type", device.type)
        .Build();
    result.push_back(device_dict);
  }
  
  return result;
}

v8::Local<v8::Promise> Chromecast::Connect(const std::string& device_id, 
                                           v8::Isolate* isolate) {
  gin_helper::Promise<void> promise(isolate);
  v8::Local<v8::Promise> handle = promise.GetHandle();
  
  auto device_it = devices_.find(device_id);
  if (device_it == devices_.end()) {
    promise.Reject("Device not found");
    return handle;
  }
  
  // For now, just simulate a successful connection
  // In a real implementation, this would establish a connection to the Cast device
  base::SequencedTaskRunner::GetCurrentDefault()->PostDelayedTask(
      FROM_HERE,
      base::BindOnce([](gin_helper::Promise<void> promise) {
        promise.Resolve();
      }, std::move(promise)),
      base::Milliseconds(100));
  
  return handle;
}

void Chromecast::AddDevice(const ChromecastDevice& device) {
  devices_[device.id] = device;
  
  // Emit device event to JavaScript
  gin_helper::Dictionary device_dict = gin::DataObjectBuilder(isolate_)
      .Set("id", device.id)
      .Set("name", device.name)
      .Set("host", device.host)
      .Set("port", device.port)
      .Set("type", device.type)
      .Build();
  
  Emit("device", device_dict);
}

void Chromecast::RemoveDevice(const std::string& device_id) {
  auto device_it = devices_.find(device_id);
  if (device_it != devices_.end()) {
    ChromecastDevice device = device_it->second;
    devices_.erase(device_it);
    
    // Emit device-removed event to JavaScript
    gin_helper::Dictionary device_dict = gin::DataObjectBuilder(isolate_)
        .Set("id", device.id)
        .Set("name", device.name)
        .Set("host", device.host)
        .Set("port", device.port)
        .Set("type", device.type)
        .Build();
    
    Emit("device-removed", device_dict);
  }
}

gin::ObjectTemplateBuilder Chromecast::GetObjectTemplateBuilder(
    v8::Isolate* isolate) {
  return gin_helper::EventEmitterMixin<Chromecast>::GetObjectTemplateBuilder(isolate)
      .SetMethod("startDiscovery", &Chromecast::StartDiscovery)
      .SetMethod("stopDiscovery", &Chromecast::StopDiscovery)
      .SetMethod("getDevices", &Chromecast::GetDevices)
      .SetMethod("connect", &Chromecast::Connect);
}

const char* Chromecast::GetTypeName() {
  return "Chromecast";
}

}  // namespace electron::api

namespace {

using electron::api::Chromecast;

void Initialize(v8::Local<v8::Object> exports,
                v8::Local<v8::Value> unused,
                v8::Local<v8::Context> context,
                void* priv) {
  v8::Isolate* const isolate = electron::JavascriptEnvironment::GetIsolate();
  gin_helper::Dictionary dict{isolate, exports};
  dict.SetMethod("createChromecast",
                 base::BindRepeating(&Chromecast::Create));
}

}  // namespace

NODE_LINKED_BINDING_CONTEXT_AWARE(electron_browser_chromecast, Initialize)