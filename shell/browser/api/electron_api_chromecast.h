// Copyright (c) 2024 GitHub, Inc.
// Use of this source code is governed by the MIT license that can be
// found in the LICENSE file.

#ifndef ELECTRON_SHELL_BROWSER_API_ELECTRON_API_CHROMECAST_H_
#define ELECTRON_SHELL_BROWSER_API_ELECTRON_API_CHROMECAST_H_

#include <map>
#include <memory>
#include <string>

#include "base/memory/weak_ptr.h"
#include "shell/common/gin_helper/event_emitter.h"
#include "shell/common/gin_helper/handle.h"
#include "shell/common/gin_helper/pinnable.h"
#include "v8/include/v8.h"

namespace gin_helper {
class Dictionary;
}

namespace electron::api {

struct ChromecastDevice {
  std::string id;
  std::string name;
  std::string host;
  int port;
  std::string type;
};

class Chromecast final : public gin_helper::EventEmitterMixin<Chromecast>,
                         public gin_helper::Pinnable<Chromecast> {
 public:
  static gin_helper::Handle<Chromecast> Create(v8::Isolate* isolate);

  // gin_helper::Wrappable:
  static gin::WrapperInfo kWrapperInfo;
  gin::ObjectTemplateBuilder GetObjectTemplateBuilder(
      v8::Isolate* isolate) override;
  const char* GetTypeName() override;

  // API methods
  void StartDiscovery();
  void StopDiscovery();
  std::vector<gin_helper::Dictionary> GetDevices(v8::Isolate* isolate);
  v8::Local<v8::Promise> Connect(const std::string& device_id, v8::Isolate* isolate);

  // Internal methods
  void AddDevice(const ChromecastDevice& device);
  void RemoveDevice(const std::string& device_id);

  // disable copy
  Chromecast(const Chromecast&) = delete;
  Chromecast& operator=(const Chromecast&) = delete;

 private:
  explicit Chromecast(v8::Isolate* isolate);
  ~Chromecast() override;

  bool discovering_ = false;
  std::map<std::string, ChromecastDevice> devices_;
  v8::Isolate* isolate_;
  base::WeakPtrFactory<Chromecast> weak_factory_{this};
};

}  // namespace electron::api

#endif  // ELECTRON_SHELL_BROWSER_API_ELECTRON_API_CHROMECAST_H_