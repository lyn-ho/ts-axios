import axios, { AxiosResponse, AxiosError } from '../src/index'
import { getAjaxRequest } from './helper'

describe('requests', () => {
  beforeEach(() => {
    jasmine.Ajax.install()
  })

  afterEach(() => {
    jasmine.Ajax.uninstall()
  })

  test('should treat single string arg as url', () => {
    axios('/foo')

    return getAjaxRequest().then(request => {
      expect(request.url).toBe('/foo')
      expect(request.method).toBe('GET')
    })
  })

  test('should treat method value as lowercase string', () => {
    // tslint:disable-next-line: no-floating-promises
    axios({ url: '/foo', method: 'POST' }).then(res => {
      expect(res.config.method).toBe('post')
    })

    return getAjaxRequest().then(req => {
      req.respondWith({ status: 200 })
    })
  })

  test('should reject on network errors', () => {
    const resolveSpy = jest.fn((res: AxiosResponse) => {
      return res
    })

    const rejectSpy = jest.fn((e: AxiosError) => {
      return e
    })

    jasmine.Ajax.uninstall()

    return axios('/foo')
      .then(resolveSpy)
      .catch(rejectSpy)
      .then(next)

    function next(reason: AxiosResponse | AxiosError) {
      expect(resolveSpy).not.toHaveBeenCalled()
      expect(rejectSpy).toHaveBeenCalled()
      expect(reason instanceof Error).toBeTruthy()
      // expect((reason as AxiosError).message).toBe('Network Error')
      expect((reason as AxiosError).message).toBe('Request failed with status code 503')
      expect(reason.request).toEqual(expect.any(XMLHttpRequest))

      jasmine.Ajax.install()
    }
  })

  test('should reject when request timeout', done => {
    let err: AxiosError

    axios('/foo', {
      timeout: 2000,
      method: 'post'
    }).catch(error => {
      err = error
    })

    // tslint:disable-next-line: no-floating-promises
    getAjaxRequest().then(req => {
      // @ts-ignore
      req.eventBus.trigger('timeout')

      setTimeout(() => {
        expect(err instanceof Error).toBeTruthy()
        expect(err.message).toBe('Timeout of 2000 ms exceeded')

        done()
      }, 100)
    })
  })

  test('should reject when status is 0', () => {
    const resolveSpy = jest.fn((res: AxiosResponse) => {
      return res
    })

    const rejectSpy = jest.fn((e: AxiosError) => {
      return e
    })

    // tslint:disable-next-line: no-floating-promises
    axios('/foo')
      .then(resolveSpy)
      .catch(rejectSpy)
      .then(next)

    return getAjaxRequest().then(req => {
      req.respondWith({ status: 0 })
    })

    function next(reason: AxiosResponse | AxiosError) {
      expect(resolveSpy).not.toHaveBeenCalled()
      expect(rejectSpy).toHaveBeenCalled()
      expect(reason instanceof Error).toBeTruthy()
      expect((reason as AxiosError).message).toBe('Request failed with status code 0')
      expect((reason as AxiosError).response!.status).toBe(0)
    }
  })

  test('should reject when validateStatus return false', () => {
    const resolveSpy = jest.fn((res: AxiosResponse) => {
      return res
    })

    const rejectSpy = jest.fn((e: AxiosError) => {
      return e
    })

    // tslint:disable-next-line: no-floating-promises
    axios('/foo', {
      validateStatus(status) {
        return status !== 500
      }
    })
      .then(resolveSpy)
      .catch(rejectSpy)
      .then(next)

    return getAjaxRequest().then(req => {
      req.respondWith({ status: 500 })
    })

    function next(reason: AxiosResponse | AxiosError) {
      expect(resolveSpy).not.toHaveBeenCalled()
      expect(rejectSpy).toHaveBeenCalled()
      expect(reason instanceof Error).toBeTruthy()
      expect((reason as AxiosError).message).toBe('Request failed with status code 500')
      expect((reason as AxiosError).response!.status).toBe(500)
    }
  })

  test('should resolve when validateStatus return true', () => {
    const resolveSpy = jest.fn((res: AxiosResponse) => {
      return res
    })

    const rejectSpy = jest.fn((e: AxiosError) => {
      return e
    })

    // tslint:disable-next-line: no-floating-promises
    axios('/foo', {
      validateStatus(status) {
        return status === 500
      }
    })
      .then(resolveSpy)
      .catch(rejectSpy)
      .then(next)

    return getAjaxRequest().then(req => {
      req.respondWith({ status: 500 })
    })

    function next(res: AxiosResponse | AxiosError) {
      expect(resolveSpy).toHaveBeenCalled()
      expect(rejectSpy).not.toHaveBeenCalled()
      expect(res.config.url).toBe('/foo')
    }
  })

  test('should return JSON when resolved', done => {
    let response: AxiosResponse

    // tslint:disable-next-line: no-floating-promises
    axios('/api/account/sign', {
      auth: {
        username: '',
        password: ''
      },
      method: 'post',
      headers: {
        Accept: 'application/json'
      }
    }).then(res => {
      response = res
    })

    // tslint:disable-next-line: no-floating-promises
    getAjaxRequest().then(req => {
      req.respondWith({
        status: 200,
        statusText: 'OK',
        responseText: '{"errno": 0}'
      })

      setTimeout(() => {
        expect(response.data).toEqual({ errno: 0 })
        done()
      }, 1000)
    })
  })

  test('should return JSON when rejecting', done => {
    let response: AxiosResponse

    axios('/api/account/sign', {
      auth: {
        username: '',
        password: ''
      },
      method: 'post',
      headers: {
        Accept: 'application/json'
      }
    }).catch(error => {
      response = error.response
    })

    // tslint:disable-next-line: no-floating-promises
    getAjaxRequest().then(req => {
      req.respondWith({
        status: 400,
        statusText: 'Bad Request',
        responseText: '{"error": "BAD USERNAME", "code": 1}'
      })

      setTimeout(() => {
        expect(typeof response.data).toBe('object')
        expect(response.data.error).toBe('BAD USERNAME')
        expect(response.data.code).toBe(1)
        done()
      }, 100)
    })
  })

  test('should supply correct response', done => {
    let response: AxiosResponse

    // tslint:disable-next-line: no-floating-promises
    axios.post('/foo').then(res => {
      response = res
    })

    // tslint:disable-next-line: no-floating-promises
    getAjaxRequest().then(req => {
      req.respondWith({
        status: 200,
        statusText: 'OK',
        responseText: '{"foo": "bar"}',
        responseHeaders: {
          'Content-Type': 'application/json'
        }
      })

      setTimeout(() => {
        expect(response.data.foo).toBe('bar')
        expect(response.status).toBe(200)
        expect(response.statusText).toBe('OK')
        expect(response.headers['content-type']).toBe('application/json')
        done()
      }, 100)
    })
  })

  test('should allow overriding Content-Type header case-insensitive', () => {
    axios.post('/foo', { prop: 'value' }, { headers: { 'content-type': 'application/json' } })

    return getAjaxRequest().then(req => {
      expect(req.requestHeaders['Content-Type']).toBe('application/json')
    })
  })

  test('should support array buffer response', done => {
    let res: AxiosResponse

    function str2ab(str: string) {
      const buff = new ArrayBuffer(str.length * 2)
      const view = new Uint16Array(buff)

      for (let i = 0; i < str.length; i++) {
        view[i] = str.charCodeAt(i)
      }

      return buff
    }

    // tslint:disable-next-line: no-floating-promises
    axios('/foo', { responseType: 'arraybuffer' }).then(data => (res = data))

    // tslint:disable-next-line: no-floating-promises
    getAjaxRequest().then(req => {
      req.respondWith({
        status: 200,
        // @ts-ignore
        responseText: str2ab('Hello world')
      })

      setTimeout(() => {
        expect(res.data.byteLength).toBe(22)
        done()
      }, 100)
    })
  })
})
